import { memoDocRef, setDoc, onSnapshot } from './firebase.js';

// CodeMirrorの初期化
const editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
    lineNumbers: true,
    mode: "markdown",
    theme: "dracula",
    lineWrapping: true,
    inputStyle: "contenteditable" // iPhoneでの入力に必須
});

let isRemoteUpdate = false;
let saveTimeout = null;

// 1. Firestoreからデータを受信して反映
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

// 2. エディタの内容が変更されたら1秒後に保存
editor.on("change", (instance, changeObj) => {
    // 外部（setValue）からの変更でない場合のみ処理
    if (changeObj.origin !== "setValue" && !isRemoteUpdate) {
        if (saveTimeout) clearTimeout(saveTimeout);
        
        saveTimeout = setTimeout(() => {
            const content = instance.getValue();
            setDoc(memoDocRef, { content: content }, { merge: true })
                .then(() => console.log("Saved!"))
                .catch((error) => console.error("Save error:", error));
        }, 1000); // 1秒間入力が止まったら送信
    }
});
