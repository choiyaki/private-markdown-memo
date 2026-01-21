import { memoDocRef, setDoc, onSnapshot } from './firebase.js';

const editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
    lineNumbers: true,
    mode: "javascript",
    theme: "dracula",
    lineWrapping: true
});


let isRemoteUpdate = false;
let saveTimeout = null;
let lastInputTime = 0; // 最後に自分が入力した時刻を記録

// 1. 受信処理（自分の入力直後なら無視するガードを追加）
onSnapshot(memoDocRef, (doc) => {
    const now = Date.now();
    // 最後に自分で入力してから1.5秒以内は、外部からの同期を無視する
    if (now - lastInputTime < 1500) return;

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

// 2. 送信処理（時差を短縮）
const saveToFirebase = () => {
    if (saveTimeout) clearTimeout(saveTimeout);
    const content = editor.getValue();
    setDoc(memoDocRef, { content: content }, { merge: true })
        .catch((err) => console.error("保存失敗:", err));
};

editor.on("change", (instance, changeObj) => {
    if (changeObj.origin !== "setValue" && !isRemoteUpdate) {
        lastInputTime = Date.now(); // 入力時刻を更新
        
        if (saveTimeout) clearTimeout(saveTimeout);
        // 保存までの待ち時間を 300ms に短縮（体感的にほぼ即時）
        saveTimeout = setTimeout(saveToFirebase, 300);
    }
});

// 3. キーイベント（リスト補完）
editor.on("keydown", (instance, event) => {
    if (event.keyCode === 13) { // Enter
        lastInputTime = Date.now(); // Enterも入力としてカウント
        
        const cursor = instance.getCursor();
        const lineContent = instance.getLine(cursor.line);
        const listMatch = lineContent.match(/^(\s*)- \s?/);

        if (listMatch) {
            if (lineContent.trim() === "-") {
                instance.replaceRange("", {line: cursor.line, ch: 0}, {line: cursor.line, ch: lineContent.length});
            } else {
                // 補完の実行を 1ms にして即時化
                setTimeout(() => {
                    instance.replaceSelection("- ");
                }, 1);
            }
        }
        saveToFirebase(); // Enter時は即座に飛ばす
    }
});
