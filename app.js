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
        indentWithTabs: true, // タブを使用
        lineWiseCopyCut: true,
        viewportMargin: Infinity, 
        extraKeys: {
            "Enter": (cm) => {
                const cursor = cm.getCursor();
                const lineText = cm.getLine(cursor.line);
                const match = lineText.match(/^([\s\t]*)([-*+] )(\[[ xX]\] )?/);

                if (match) {
                    const [full, indent, bullet, checkbox] = match;
                    if (lineText.trim() === (bullet + (checkbox || "")).trim()) {
                        cm.replaceRange("", {line: cursor.line, ch: 0}, {line: cursor.line, ch: lineText.length});
                        cm.replaceSelection("\n");
                    } else {
                        const nextMarker = "\n" + indent + bullet + (checkbox ? "[ ] " : "");
                        cm.replaceSelection(nextMarker);
                    }
                    return;
                }
                return CodeMirror.Pass;
            },
            "Tab": (cm) => {
                if (cm.somethingSelected()) {
                    cm.indentSelection("add");
                } else {
                    cm.replaceSelection("\t", "end");
                }
            }
        }
    });

    // 文頭を揃えるための動的レンダリング設定（タブ幅対応版）
    editor.on("renderLine", (cm, line, elt) => {
        const match = line.text.match(/^([\s\t]*[-*+] )(\[[ xX]\] )?/);
        if (match) {
            // タブをスペース2つ分として計算した「見た目上の文字幅」を取得
            const visualWidth = CodeMirror.countColumn(match[0], null, cm.getOption("tabSize"));
            elt.style.paddingLeft = visualWidth + "ch";
            elt.style.textIndent = "-" + visualWidth + "ch";
        } else {
            elt.style.paddingLeft = "";
            elt.style.textIndent = "";
        }
    });

    editor.refresh();
} catch (error) {
    console.error("Initialization error:", error);
}

// --- Firebase同期ロジック ---
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

// --- ツールバーボタンのイベント ---
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

document.getElementById("checkbox-btn").addEventListener("click", () => {
    const cursor = editor.getCursor();
    const lineText = editor.getLine(cursor.line);
    
    if (lineText.includes("[ ]")) {
        editor.replaceRange("[x]", {line: cursor.line, ch: lineText.indexOf("[ ]")}, {line: cursor.line, ch: lineText.indexOf("[ ]") + 3});
    } else if (lineText.includes("[x]")) {
        editor.replaceRange("[ ]", {line: cursor.line, ch: lineText.indexOf("[x]")}, {line: cursor.line, ch: lineText.indexOf("[x]") + 3});
    } else {
        const listMatch = lineText.match(/^([\s\t]*)([-*+] )/);
        if (listMatch) {
            editor.replaceRange(listMatch[0] + "[ ] ", {line: cursor.line, ch: 0}, {line: cursor.line, ch: listMatch[0].length});
        } else {
            editor.replaceRange("- [ ] " + lineText, {line: cursor.line, ch: 0}, {line: cursor.line, ch: lineText.length});
        }
    }
    editor.focus();
});

editor.on("change", (cm, changeObj) => {
    if (isInternalChange || changeObj.origin === "setValue") return;
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveToFirebase, 800);
});
