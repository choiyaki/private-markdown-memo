import { memoDocRef, setDoc, onSnapshot } from './firebase.js';

let editor;
let lastSyncedContent = "";
let isInternalChange = false;
let saveTimeout = null;

try {
    editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
        lineNumbers: true,
        mode: "gfm",
        theme: "dracula",
        lineWrapping: true,
        inputStyle: "contenteditable",
        indentUnit: 2,         
        smartIndent: true,     
        tabSize: 2,            
        lineWiseCopyCut: true,
        viewportMargin: Infinity, 
        extraKeys: {
            "Enter": (cm) => {
                const cursor = cm.getCursor();
                const lineText = cm.getLine(cursor.line);
                // インデント、リスト記号、チェックボックスを判定
                const match = lineText.match(/^(\s*)([-*+] )(\[[ xX]\] )?/);

                if (match) {
                    const [full, indent, bullet, checkbox] = match;
                    // 内容が空（記号のみ）の場合は、記号を消して改行（リスト終了）
                    if (lineText.trim() === (bullet + (checkbox || "")).trim()) {
                        cm.replaceRange("", {line: cursor.line, ch: 0}, {line: cursor.line, ch: lineText.length});
                        cm.replaceSelection("\n");
                    } else {
                        // 内容がある場合は、改行＋次のリスト記号を挿入
                        const nextMarker = "\n" + indent + bullet + (checkbox ? "[ ] " : "");
                        cm.replaceSelection(nextMarker);
                    }
                    return; // 独自処理を行ったのでここで終了
                }
                // リスト以外は標準の改行挙動を許可
                return CodeMirror.Pass;
            }
        }
    });

    // ② renderLine の処理（整列表示）
    editor.on("renderLine", (cm, line, elt) => {
        const match = line.text.match(/^(\s*[-*+] )(\[[ xX]\] )?/);
        if (match) {
            const fullMarker = match[0];
            const length = fullMarker.length;
            elt.style.paddingLeft = length + "ch";
            elt.style.textIndent = "-" + length + "ch";
        } else {
            elt.style.paddingLeft = "";
            elt.style.textIndent = "";
        }
    });

    editor.refresh();
} catch (error) {
    console.error("Initialization error:", error);
}

// --- 同期・ボタン・変更検知ロジック ---
// (以下の部分は提供いただいたコードのままで完璧です)

onSnapshot(memoDocRef, (doc) => {
    if (!doc.exists()) return;
    const remoteContent = doc.data().content || "";
    if (remoteContent === editor.getValue()) {
        lastSyncedContent = remoteContent;
        return;
    }
    if (editor.hasFocus() && editor.getValue() !== "") return;

    isInternalChange = true;
    const cursor = editor.getCursor();
    editor.setValue(remoteContent);
    editor.setCursor(cursor);
    lastSyncedContent = remoteContent;
    isInternalChange = false;
});

const saveToFirebase = () => {
    const currentContent = editor.getValue();
    if (currentContent === lastSyncedContent) return;
    setDoc(memoDocRef, { content: currentContent }, { merge: true })
        .then(() => { lastSyncedContent = currentContent; })
        .catch(err => console.error("Save error:", err));
};

document.getElementById("indent-btn").addEventListener("click", () => {
    editor.execCommand("indentMore");
    editor.focus();
});

document.getElementById("outdent-btn").addEventListener("click", () => {
    editor.execCommand("indentLess");
    editor.focus();
});

document.getElementById("move-up-btn").addEventListener("click", () => {
    const cursor = editor.getCursor();
    const line = cursor.line;
    if (line > 0) {
        const currentText = editor.getLine(line);
        const prevText = editor.getLine(line - 1);
        editor.replaceRange(currentText, {line: line - 1, ch: 0}, {line: line - 1, ch: prevText.length});
        editor.replaceRange(prevText, {line: line, ch: 0}, {line: line, ch: currentText.length});
        editor.setCursor({line: line - 1, ch: cursor.ch});
    }
    editor.focus();
});

document.getElementById("move-down-btn").addEventListener("click", () => {
    const cursor = editor.getCursor();
    const line = cursor.line;
    const lastLine = editor.lineCount() - 1;
    if (line < lastLine) {
        const currentText = editor.getLine(line);
        const nextText = editor.getLine(line + 1);
        editor.replaceRange(currentText, {line: line + 1, ch: 0}, {line: line + 1, ch: nextText.length});
        editor.replaceRange(nextText, {line: line, ch: 0}, {line: line, ch: currentText.length});
        editor.setCursor({line: line + 1, ch: cursor.ch});
    }
    editor.focus();
});

editor.on("change", (cm, changeObj) => {
    if (isInternalChange || changeObj.origin === "setValue") return;
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveToFirebase, 800);
});
