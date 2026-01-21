import { memoDocRef, setDoc, onSnapshot } from './firebase.js';

const editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
    lineNumbers: true,
    mode: "gfm",
    theme: "dracula",
    lineWrapping: true,
    inputStyle: "contenteditable",
    spellcheck: false,
    autocorrect: false
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

// 2. Firebase保存関数
const saveToFirebase = () => {
    if (saveTimeout) clearTimeout(saveTimeout);
    const content = editor.getValue();
    setDoc(memoDocRef, { content: content }, { merge: true })
        .then(() => console.log("Saved"))
        .catch((err) => console.error("Error:", err));
};

// 3. 変更検知（保存予約のみ）
editor.on("change", (cm, changeObj) => {
    if (changeObj.origin !== "setValue" && !isRemoteUpdate) {
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(saveToFirebase, 1000);
    }
});

// 4. キーイベント制御（改行とリスト補完）
editor.on("keydown", (cm, event) => {
    // Enterキー (KeyCode 13) の場合
    if (event.keyCode === 13) {
        const cursor = cm.getCursor();
        const lineContent = cm.getLine(cursor.line);
        
        // リスト記号 (- や 1. など) で始まっているか判定
        const listMatch = lineContent.match(/^(\s*)([-*+] \s?|[0-9]+\. \s?)/);

        if (listMatch) {
            // もし記号だけで中身が空なら、その記号を消してリスト終了
            if (lineContent.trim() === listMatch[2].trim()) {
                event.preventDefault(); // 通常の改行をキャンセル
                cm.replaceRange("", {line: cursor.line, ch: 0}, {line: cursor.line, ch: lineContent.length});
            } else {
                // 内容がある場合は、改行後に記号を挿入する
                // 少し遅らせて実行することで、CodeMirror本来の改行処理を待つ
                setTimeout(() => {
                    cm.replaceSelection(listMatch[2]);
                }, 10);
            }
        }
        
        // Enterが押されたら即保存も実行
        saveToFirebase();
    }
});
