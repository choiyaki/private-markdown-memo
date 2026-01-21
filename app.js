import { memoDocRef, setDoc, onSnapshot } from './firebase.js';

let editor;
let lastSyncedContent = "";
let isInternalChange = false;
let saveTimeout = null;

// --- エディタ初期化部分の修正 ---
editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
    lineNumbers: true,
    mode: "gfm",
    theme: "dracula",
    lineWrapping: true,
    inputStyle: "contenteditable",
    indentUnit: 2,         
    smartIndent: true,     
    tabSize: 2,            
    indentWithTabs: true, // ★スペースではなくタブを使用するように変更
    lineWiseCopyCut: true,
    viewportMargin: Infinity, 
    extraKeys: {
        "Enter": (cm) => {
            const cursor = cm.getCursor();
            const lineText = cm.getLine(cursor.line);
            // タブまたはスペースの後にリスト記号が続く形に対応
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
        // Tabキー自体を押した時の挙動もタブ挿入に固定
        "Tab": (cm) => {
            if (cm.somethingSelected()) {
                cm.indentSelection("add");
            } else {
                cm.replaceSelection("\t", "end");
            }
        }
    }
});

// --- チェックボックス・トグルボタンの実装 ---
document.getElementById("checkbox-btn").addEventListener("click", () => {
    const cursor = editor.getCursor();
    const lineText = editor.getLine(cursor.line);
    
    // 1. すでに [ ] または [x] がある場合は、状態を入れ替える
    if (lineText.includes("[ ]")) {
        editor.replaceRange("[x]", 
            {line: cursor.line, ch: lineText.indexOf("[ ]")}, 
            {line: cursor.line, ch: lineText.indexOf("[ ]") + 3});
    } else if (lineText.includes("[x]")) {
        editor.replaceRange("[ ]", 
            {line: cursor.line, ch: lineText.indexOf("[x]")}, 
            {line: cursor.line, ch: lineText.indexOf("[x]") + 3});
    } else {
        // 2. リスト記号はあるがチェックボックスがない場合は付与
        const listMatch = lineText.match(/^([\s\t]*)([-*+] )/);
        if (listMatch) {
            editor.replaceRange(listMatch[0] + "[ ] ", 
                {line: cursor.line, ch: 0}, 
                {line: cursor.line, ch: listMatch[0].length});
        } else {
            // 3. 何もない場合は新規リストとして作成
            editor.replaceRange("- [ ] " + lineText, 
                {line: cursor.line, ch: 0}, 
                {line: cursor.line, ch: lineText.length});
        }
    }
    editor.focus();
});

// --- (上下移動・インデント等の他のボタン処理はそのまま維持) ---


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
