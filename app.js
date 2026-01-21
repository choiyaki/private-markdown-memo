import { memoDocRef, setDoc, onSnapshot } from './firebase.js';

// --- 補完ロジックの定義 (CodeMirrorコマンドとして実装) ---
const smartNewline = (cm) => {
    if (cm.getOption("disableInput")) return CodeMirror.Pass;

    const cursor = cm.getCursor();
    const lineText = cm.getLine(cursor.line);
    
    // Markdownリストの正規表現（インデント、記号、チェックボックス）
    // 例: "  - [ ] text"
    const match = lineText.match(/^(\s*)([-*+] )(\[[ xX]\] )?/);

    if (match) {
        const [full, indent, bullet, checkbox] = match;
        
        // 行がリスト記号のみの場合：リストを終了して通常の改行
        if (lineText.trim() === (bullet + (checkbox || "")).trim()) {
            cm.replaceRange("", {line: cursor.line, ch: 0}, {line: cursor.line, ch: lineText.length});
            cm.replaceSelection("\n", "end");
        } else {
            // 内容がある場合：インデントと記号を引き継ぐ（チェックボックスは空にする）
            const nextMarker = indent + bullet + (checkbox ? "[ ] " : "");
            cm.replaceSelection("\n" + nextMarker, "end");
        }
    } else {
        // リスト以外の場所：通常の改行
        cm.replaceSelection("\n", "end");
    }
};

// --- エディタ初期化 ---
const editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
    lineNumbers: true,
    mode: "gfm",
    theme: "dracula",
    lineWrapping: true,
    inputStyle: "contenteditable",
    extraKeys: {
        // Enterキーに自作のスマート改行を割り当て
        "Enter": smartNewline
    }
});

// --- 以下、安定版同期ロジック (ver0.1から継続) ---
let lastSyncedContent = "";
let isInternalChange = false;
let saveTimeout = null;

onSnapshot(memoDocRef, (doc) => {
    if (!doc.exists()) return;
    const remoteContent = doc.data().content;
    if (remoteContent === lastSyncedContent || editor.hasFocus()) return;

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
        .catch(err => console.error(err));
};

editor.on("change", (instance, changeObj) => {
    if (isInternalChange || changeObj.origin === "setValue") return;
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveToFirebase, 800);
});
