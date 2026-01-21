import { memoDocRef, setDoc, onSnapshot } from './firebase.js';

let editor;

try {
    // 1. エディタの初期化（今動いた設定を維持）
    editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
        lineNumbers: true,
        mode: "markdown",
        theme: "dracula",
        lineWrapping: true,
        inputStyle: "contenteditable"
    });

    console.log("CodeMirror initialized");
} catch (error) {
    console.error("Initialization error:", error);
}

// 同期用の管理変数
let lastSyncedContent = "";
let isInternalChange = false;
let saveTimeout = null;

// 2. Firebaseからデータを受信 (安定化ガード)
onSnapshot(memoDocRef, (doc) => {
    try {
        if (!doc.exists()) return;
        
        const remoteContent = doc.data().content;

        // 変化がない、または入力中（フォーカスあり）なら同期しない
        if (remoteContent === lastSyncedContent || editor.hasFocus()) return;

        isInternalChange = true;
        const cursor = editor.getCursor();
        editor.setValue(remoteContent);
        editor.setCursor(cursor);
        lastSyncedContent = remoteContent;
        isInternalChange = false;
        
        console.log("Remote update applied");
    } catch (e) {
        console.error("Sync error:", e);
    }
});

// 3. Firebaseへの送信処理
const saveToFirebase = () => {
    const currentContent = editor.getValue();
    if (currentContent === lastSyncedContent) return;

    setDoc(memoDocRef, { content: currentContent }, { merge: true })
        .then(() => {
            lastSyncedContent = currentContent;
            console.log("Saved to Firestore");
        })
        .catch((err) => console.error("Save error:", err));
};

// 4. 変更検知
editor.on("change", (cm, changeObj) => {
    // 受信による変更は無視
    if (isInternalChange || changeObj.origin === "setValue") return;

    // 1秒待って保存
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveToFirebase, 1000);
});
