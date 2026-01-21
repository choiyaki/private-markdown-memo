import { memoDocRef, setDoc, onSnapshot } from './firebase.js';

// --- 既存の初期化部分 ---
const editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
    lineNumbers: true,
    mode: "gfm", // GitHub Flavored Markdown
    theme: "dracula",
    lineWrapping: true,
    inputStyle: "contenteditable",
    // 括弧の補完なども有効にしたい場合はここに追加
    autoCloseBrackets: true 
});


// --- Markdownリスト補完ロジック ---
editor.on("keydown", (cm, event) => {
    // Enterキー (KeyCode 13) かチェック
    if (event.keyCode === 13) {
        const cursor = cm.getCursor();
        const lineContent = cm.getLine(cursor.line); // 現在の行の内容を取得

        // 行が 「- 」や 「* 」 「1. 」などで始まっているか判定する正規表現
        const listMatch = lineContent.match(/^(\s*)([-*+] \s?|[0-9]+\. \s?)/);

        if (listMatch) {
            // もし行が「- 」だけで空だったら、Enterでリストを終了させる（記号を消す）
            if (lineContent.trim() === listMatch[2].trim()) {
                cm.replaceRange("", {line: cursor.line, ch: 0}, {line: cursor.line, ch: lineContent.length});
            } else {
                // 次の行に同じリスト記号を挿入
                const bullet = listMatch[2]; 
                // 番号リスト(1.)の場合は数字をインクリメントしたいところですが、まずはシンプルに同じものを
                setTimeout(() => {
                    cm.replaceSelection(bullet);
                }, 10);
            }
        }
    }
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

// 3. キーボードの「完了」や「改行」を明示的に拾う（おまけ）
editor.on("keydown", (instance, event) => {
    if (event.keyCode === 13) { // Enterキー
        saveToFirebase();
    }
});
