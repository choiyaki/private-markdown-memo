import { memoDocRef, setDoc, onSnapshot } from './firebase.js';

// CodeMirrorの初期化
const editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
    lineNumbers: true,
    mode: "javascript",
    theme: "dracula",
    lineWrapping: true
});

let isUpdating = false; // ループ防止用フラグ

// 1. Firestoreからデータをリアルタイム受信
onSnapshot(memoDocRef, (doc) => {
    if (isUpdating) return; // 自分が送信中の場合は処理しない

    if (doc.exists()) {
        const newContent = doc.data().content;
        if (newContent !== editor.getValue()) {
            const cursor = editor.getCursor();
            editor.setValue(newContent);
            editor.setCursor(cursor);
        }
    }
});

// 2. エディタの内容が変更されたらFirestoreに保存
editor.on("change", (instance, changeObj) => {
    // 外部（setValue）からの変更でない場合のみ送信
    if (changeObj.origin !== "setValue") {
        isUpdating = true;
        const content = instance.getValue();
        
        // setDocでドキュメント全体を上書き保存
        setDoc(memoDocRef, { content: content })
            .then(() => {
                isUpdating = false;
            })
            .catch((error) => {
                console.error("Error writing document: ", error);
                isUpdating = false;
            });
    }
});
