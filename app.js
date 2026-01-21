// 一旦Firebaseを切り離してテスト
// import { memoDocRef, setDoc, onSnapshot } from './firebase.js';

try {
    const editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
        lineNumbers: true,    // これで左に行番号が出るはず
        mode: "markdown",
        theme: "dracula",
        lineWrapping: true,
        inputStyle: "contenteditable"
    });

    // テスト用の文字を入れてみる
    editor.setValue("エディタは起動しています。\n行番号が見えますか？");

    console.log("CodeMirror initialized successfully");
} catch (error) {
    // もしエラーがあれば画面に表示する
    document.body.innerHTML = "<pre style='color:white; background:red; padding:20px;'>" + error + "</pre>";
}
