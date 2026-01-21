import { memoDocRef, setDoc, onSnapshot } from './firebase.js';

// 1. CodeMirrorの初期化
const editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
    lineNumbers: true,
    mode: "gfm",            // GitHub Flavored Markdown
    theme: "dracula",
    lineWrapping: true,
    inputStyle: "contenteditable", // モバイル向け互換性
    spellcheck: false,
    autocorrect: false
});

let isRemoteUpdate = false;
let saveTimeout = null;

// 2. Firebaseからデータを受信して反映
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

// 3. Firebaseへの保存処理（デバウンス機能付き）
const saveToFirebase = () => {
    if (saveTimeout) clearTimeout(saveTimeout);
    const content = editor.getValue();
    setDoc(memoDocRef, { content: content }, { merge: true })
        .then(() => console.log("Saved to Cloud"))
        .catch((err) => console.error("Save Error:", err));
};

// 4. エディタの変更検知と補完ロジック
editor.on("change", (cm, changeObj) => {
    // 外部同期以外の場合のみ保存処理へ
    if (changeObj.origin !== "setValue" && !isRemoteUpdate) {
        
        // --- Markdownリスト補完ロジック ---
        if (changeObj.origin === "+input" && changeObj.text.includes("")) {
            const cursor = cm.getCursor();
            // Enterが押された「直前の行」をチェック
            const prevLine = cm.getLine(cursor.line - 1);
            const listMatch = prevLine.match(/^(\s*)([-*+] \s?|[0-9]+\. \s?)/);

            if (listMatch) {
                // 前の行が記号だけで空だった場合は、その記号を消してリスト終了
                if (prevLine.trim() === listMatch[2].trim()) {
                    cm.replaceRange("", {line: cursor.line - 1, ch: 0}, {line: cursor.line - 1, ch: prevLine.length});
                } else {
                    // 次の行に同じ記号を自動挿入
                    cm.replaceSelection(listMatch[2]);
                }
            }
        }

        // 保存タイマー（1秒待ってから保存）
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(saveToFirebase, 1000);
    }
});

// 5. Enterキー（確定）での即時保存
editor.on("keydown", (cm, event) => {
    if (event.keyCode === 13) {
        saveToFirebase();
    }
});
