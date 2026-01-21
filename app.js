import { memoDocRef, setDoc, onSnapshot } from './firebase.js';

// 1. エディタをまず確実に立ち上げる
const editor = window.CodeMirror.fromTextArea(document.getElementById("editor"), {
    lineNumbers: true,
    mode: "gfm",
    theme: "dracula",
    lineWrapping: true,
    inputStyle: "contenteditable"
});

let lastSyncedContent = "";
let isInternalChange = false;
let saveTimeout = null;

// 2. 同期受信 (データ復旧)
onSnapshot(memoDocRef, (doc) => {
    if (!doc.exists()) return;
    const remoteContent = doc.data().content;
    if (remoteContent === lastSyncedContent || editor.hasFocus()) return;

    isInternalChange = true;
    const cursor = editor.getCursor();
    editor.setValue(remoteContent);
    editor.setCursor(cursor);
    lastSyncedContent = remoteContent;
    isInternalChange = false;
});

// 3. 保存処理
const saveToFirebase = () => {
    const currentContent = editor.getValue();
    if (currentContent === lastSyncedContent) return;
    setDoc(memoDocRef, { content: currentContent }, { merge: true })
        .then(() => { lastSyncedContent = currentContent; })
        .catch(err => console.error("Save Error:", err));
};

// 4. 変更検知 (保存タイマー)
editor.on("change", (cm, changeObj) => {
    if (isInternalChange || changeObj.origin === "setValue") return;
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveToFirebase, 800);
});

// 5. キーイベント (削除・改行を絶対に殺さない補完ロジック)
editor.on("keydown", (cm, event) => {
    // Enter (13) だけを処理
    if (event.keyCode === 13) {
        const cursor = cm.getCursor();
        const lineText = cm.getLine(cursor.line);
        
        // リスト記号の判定
        const match = lineText.match(/^(\s*)([-*+] )(\[[ xX]\] )?/);

        if (match) {
            const [full, indent, bullet, checkbox] = match;
            
            // 行が記号だけで空なら、その記号を消す (リスト終了)
            if (lineText.trim() === (bullet + (checkbox || "")).trim()) {
                // デフォルトの改行を止めて、行をクリアする
                event.preventDefault();
                cm.replaceRange("", {line: cursor.line, ch: 0}, {line: cursor.line, ch: lineText.length});
            } else {
                // 文字があるなら、少し遅らせて記号を挿入 (デフォルトの改行を邪魔しない)
                const nextMarker = indent + bullet + (checkbox ? "[ ] " : "");
                setTimeout(() => {
                    cm.replaceSelection(nextMarker);
                }, 10);
            }
        }
        // Enter時は即時保存
        saveToFirebase();
    }
    // ここで return true とか event.preventDefault をしない限り、
    // BackSpaceなどはブラウザ標準の動きになります。
});
