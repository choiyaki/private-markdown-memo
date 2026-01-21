import { db, ref, set, onValue } from './firebase.js';

// CodeMirrorの初期化
const editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
    lineNumbers: true,
    mode: "javascript",
    theme: "dracula",
    lineWrapping: true
});

const memoRef = ref(db, 'shared_memo/content');

// 1. Firebaseからデータを受信してエディタに反映
onValue(memoRef, (snapshot) => {
    const data = snapshot.val();
    if (data !== null && data !== editor.getValue()) {
        // カーソル位置を保持するための工夫が必要ですが、まずは単純な反映
        const cursor = editor.getCursor();
        editor.setValue(data);
        editor.setCursor(cursor);
    }
});

// 2. エディタの内容が変更されたらFirebaseに保存
editor.on("change", (instance, changeObj) => {
    // 'setValue' による変更（外部からの同期）以外の場合のみ送信
    if (changeObj.origin !== "setValue") {
        const content = instance.getValue();
        set(memoRef, content);
    }
});
