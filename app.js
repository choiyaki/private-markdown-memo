import { memoDocRef, setDoc, onSnapshot } from './firebase.js';

// 1. エディタの初期化（基本機能のみ）
const editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
    lineNumbers: true,      // 行番号を表示
    mode: "gfm",            // GitHub Flavored Markdownモード
    theme: "dracula",       // テーマ
    lineWrapping: true,     // 折り返しあり
    inputStyle: "contenteditable" // iPhoneでの入力を安定させる
});

// 2. 同期用の管理変数
let lastSyncedContent = "";
let isInternalChange = false;
let saveTimeout = null;

// 3. Firebaseからデータを受信 (安定化ガード付き)
onSnapshot(memoDocRef, (doc) => {
    if (!doc.exists()) return;
    
    const remoteContent = doc.data().content;

    // 自分の入力した内容と全く同じなら無視
    if (remoteContent === lastSyncedContent) return;
    
    // 入力中（フォーカスがある時）は外部更新をブロックして競合を防ぐ
    if (editor.hasFocus()) return;

    isInternalChange = true;
    const cursor = editor.getCursor();
    editor.setValue(remoteContent);
    editor.setCursor(cursor);
    lastSyncedContent = remoteContent;
    isInternalChange = false;
});

// 4. Firebaseへの送信
const saveToFirebase = () => {
    const currentContent = editor.getValue();
    if (currentContent === lastSyncedContent) return;

    setDoc(memoDocRef, { content: currentContent }, { merge: true })
        .then(() => {
            lastSyncedContent = currentContent;
            console.log("Firestoreと同期しました");
        })
        .catch((err) => console.error("保存失敗:", err));
};

// 5. エディタの変更を検知
editor.on("change", (cm, changeObj) => {
    // 内部的な書き換え（受信時）は無視
    if (isInternalChange || changeObj.origin === "setValue") return;

    // 保存タイマー（1秒入力が止まったら保存）
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveToFirebase, 1000);
});
