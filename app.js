import { memoDocRef, setDoc, onSnapshot } from './firebase.js';

const editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
    lineNumbers: true,
    mode: "gfm",
    theme: "dracula",
    lineWrapping: true,
    inputStyle: "contenteditable",
    // ここから重要設定
    extraKeys: {
        "Enter": "newlineAndIndentContinueMarkdownList" // 公式アドオンの機能
    }
});

let isRemoteUpdate = false;
let saveTimeout = null;

// 1. Firebase受信
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

// 2. 保存関数
const saveToFirebase = () => {
    const content = editor.getValue();
    setDoc(memoDocRef, { content: content }, { merge: true })
        .catch((err) => console.error("Save Error:", err));
};

// 3. 変更検知（保存とEnterの検知）
editor.on("change", (cm, changeObj) => {
    if (changeObj.origin !== "setValue" && !isRemoteUpdate) {
        // 保存タイマー（デバウンス）
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(saveToFirebase, 1000);
        
        // Enter（改行）が含まれる変更の場合、即時保存
        if (changeObj.text.includes("")) {
            saveToFirebase();
        }
    }
});
