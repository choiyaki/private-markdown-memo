import { memoDocRef, setDoc, onSnapshot } from './firebase.js';

// 設定を最小限にします
const editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
    lineNumbers: true,
    mode: "gfm",
    theme: "dracula",
    lineWrapping: true,
    inputStyle: "contenteditable" // iPhoneで文字を打つために必須
});

let isRemoteUpdate = false;

// 1. Firebaseからデータを受け取る
onSnapshot(memoDocRef, (doc) => {
    if (doc.exists()) {
        const remoteContent = doc.data().content;
        if (remoteContent !== editor.getValue()) {
            isRemoteUpdate = true;
            const cursor = editor.getCursor();
            editor.setValue(remoteContent);
            editor.setCursor(cursor);
            isRemoteUpdate = false;
        }
    }
});

// 2. 変更があったら1秒後に保存（Enter判定などは一切なし）
let saveTimeout = null;
editor.on("change", () => {
    if (isRemoteUpdate) return; // リモートからの更新時は何もしない

    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        const content = editor.getValue();
        setDoc(memoDocRef, { content: content }, { merge: true })
            .catch(err => console.error("Save error:", err));
    }, 1000);
});
