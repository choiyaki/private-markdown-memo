import { memoDocRef, setDoc, onSnapshot } from './firebase.js';

const editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
    lineNumbers: true,
    mode: "javascript",
    theme: "dracula",
    lineWrapping: true
});

let isRemoteUpdate = false;
let saveTimeout = null;

// 1. 受信処理（変更なし）
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

// 2. 送信処理（保存のタイミングを制御）
const saveToFirebase = () => {
    if (saveTimeout) clearTimeout(saveTimeout);
    const content = editor.getValue();
    setDoc(memoDocRef, { content: content }, { merge: true })
        .then(() => console.log("Firestoreに保存されました"))
        .catch((err) => console.error("保存失敗:", err));
};

editor.on("change", (instance, changeObj) => {
    if (changeObj.origin !== "setValue" && !isRemoteUpdate) {
        // iPhoneの変換確定（Enter）や、入力の区切りを検知
        // 1. Enterキーが押された場合（確定）は即座にタイマーを短くする
        if (changeObj.text.includes("") || changeObj.origin === "+input") {
            if (saveTimeout) clearTimeout(saveTimeout);
            
            // 入力が止まってから1秒後、または次の確定時に保存
            saveTimeout = setTimeout(saveToFirebase, 1000);
        }
    }
});

// 3. 改行時にリスト記号を自動挿入する (ver0.1への追加機能)
editor.on("keydown", (instance, event) => {
    if (event.keyCode === 13) { // Enterキー
        const cursor = instance.getCursor();
        const lineContent = instance.getLine(cursor.line);
        
        // 行が 「- 」で始まっているか判定
        const listMatch = lineContent.match(/^(\s*)- \s?/);

        if (listMatch) {
            // 中身が空の「- 」なら、Enterでその行の記号を消す（リスト終了）
            if (lineContent.trim() === "-") {
                instance.replaceRange("", {line: cursor.line, ch: 0}, {line: cursor.line, ch: lineContent.length});
            } else {
                // 文字がある場合は、改行後に「- 」を挿入
                setTimeout(() => {
                    instance.replaceSelection("- ");
                }, 10);
            }
        }
        saveToFirebase(); // Enter時に保存
    }
});
