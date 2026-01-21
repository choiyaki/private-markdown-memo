import { memoDocRef, setDoc, onSnapshot } from './firebase.js';

const editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
    lineNumbers: true,
    mode: "gfm", // チェックボックスを認識するためにgfm（GitHub Flavored Markdown）を使用
    theme: "dracula",
    lineWrapping: true,
    inputStyle: "contenteditable",
    // ★ここがポイント：Enterキーの挙動を公式アドオンに委ねる
    extraKeys: {
        "Enter": "newlineAndIndentContinueMarkdownList"
    }
});

let lastSyncedContent = "";
let isInternalChange = false;
let saveTimeout = null;

// 1. 同期受信（安定版ver0.1のロジックを維持）
onSnapshot(memoDocRef, (doc) => {
    if (!doc.exists()) return;
    const remoteContent = doc.data().content;
    if (remoteContent === lastSyncedContent) return;
    if (editor.hasFocus()) return; 

    isInternalChange = true;
    const cursor = editor.getCursor();
    editor.setValue(remoteContent);
    editor.setCursor(cursor);
    lastSyncedContent = remoteContent;
    isInternalChange = false;
});

// 2. 保存処理
const saveToFirebase = () => {
    const currentContent = editor.getValue();
    if (currentContent === lastSyncedContent) return;

    setDoc(memoDocRef, { content: currentContent }, { merge: true })
        .then(() => {
            lastSyncedContent = currentContent;
            console.log("Synced");
        })
        .catch(err => console.error("Save Error:", err));
};

// 3. 変更検知
editor.on("change", (instance, changeObj) => {
    if (isInternalChange || changeObj.origin === "setValue") return;

    if (saveTimeout) clearTimeout(saveTimeout);
    // 保存は少し余裕を持って（1秒）
    saveTimeout = setTimeout(saveToFirebase, 1000);
});
