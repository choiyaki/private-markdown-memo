import { memoDocRef, setDoc, onSnapshot } from './firebase.js';

// --- エディタ初期化 ---
const editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
    lineNumbers: true,
    mode: "gfm",
    theme: "dracula",
    lineWrapping: true,
    inputStyle: "contenteditable",
    // 削除や改行を妨げないよう、ここでの設定を極力シンプルにします
});

// --- 同期用変数 ---
let lastSyncedContent = "";
let isInternalChange = false;
let saveTimeout = null;

// --- 1. 同期受信 (変更なし) ---
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

// --- 2. 保存処理 (変更なし) ---
const saveToFirebase = () => {
    const currentContent = editor.getValue();
    if (currentContent === lastSyncedContent) return;
    setDoc(memoDocRef, { content: currentContent }, { merge: true })
        .then(() => { lastSyncedContent = currentContent; })
        .catch(err => console.error(err));
};

// --- 3. 変更検知とスマート改行補完 ---
editor.on("change", (cm, changeObj) => {
    if (isInternalChange || changeObj.origin === "setValue") return;

    // 改行（+input かつ text[0]が空文字）を検知したときだけ補完を実行
    if (changeObj.origin === "+input" && changeObj.text.length === 2 && changeObj.text[0] === "") {
        const cursor = cm.getCursor();
        const prevLineNum = cursor.line - 1;
        const prevLineText = cm.getLine(prevLineNum);

        // Markdownリストの判定
        const match = prevLineText.match(/^(\s*)([-*+] )(\[[ xX]\] )?/);

        if (match) {
            const [full, indent, bullet, checkbox] = match;
            
            // 前の行が記号だけで中身が空なら、その記号を消してリスト終了
            if (prevLineText.trim() === (bullet + (checkbox || "")).trim()) {
                cm.replaceRange("", {line: prevLineNum, ch: 0}, {line: prevLineNum, ch: prevLineText.length});
            } else {
                // 内容がある場合、現在の行にインデントと記号を挿入
                const nextMarker = indent + bullet + (checkbox ? "[ ] " : "");
                cm.replaceSelection(nextMarker, "end");
            }
        }
        saveToFirebase(); // 改行時は即座に保存
    }

    // 通常の保存タイマー
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveToFirebase, 1000);
});
