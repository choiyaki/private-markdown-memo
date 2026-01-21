import { memoDocRef, setDoc, onSnapshot } from './firebase.js';

/**
 * スマート改行コマンド
 * 前の行のリスト記号を判定し、適切に補完または終了させます。
 */
const handleEnter = (cm) => {
    const cursor = cm.getCursor();
    const lineText = cm.getLine(cursor.line);
    const match = lineText.match(/^(\s*)([-*+] )(\[[ xX]\] )?/);

    if (match) {
        const [full, indent, bullet, checkbox] = match;
        // 記号のみで中身が空なら、記号を消してリストを終了
        if (lineText.trim() === (bullet + (checkbox || "")).trim()) {
            cm.replaceRange("", {line: cursor.line, ch: 0}, {line: cursor.line, ch: lineText.length});
            return CodeMirror.Pass; // 通常の改行（デフォルト挙動）へ
        } else {
            // 内容があるなら、改行して次の行に記号を挿入
            const nextMarker = indent + bullet + (checkbox ? "[ ] " : "");
            cm.replaceSelection("\n" + nextMarker);
            return; // 処理完了
        }
    }
    return CodeMirror.Pass; // リスト以外は標準の改行
};

// --- エディタ初期化 ---
const editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
    lineNumbers: true,
    mode: "gfm",
    theme: "dracula",
    lineWrapping: true,
    inputStyle: "contenteditable",
    extraKeys: {
        // 公式ドキュメントに則り、Enterキーの挙動をオーバーライド
        "Enter": handleEnter,
        // Tabキーでのインデントも有効にする（おまけ）
        "Tab": (cm) => cm.execCommand("indentMore"),
        "Shift-Tab": (cm) => cm.execCommand("indentLess"),
    }
});

// --- 同期管理 ---
let lastSyncedContent = "";
let isInternalChange = false;
let saveTimeout = null;

// 1. 同期受信 (エディタにフォーカスがある時は上書きしない)
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

// 2. 保存処理
const saveToFirebase = () => {
    const currentContent = editor.getValue();
    if (currentContent === lastSyncedContent) return;
    setDoc(memoDocRef, { content: currentContent }, { merge: true })
        .then(() => { lastSyncedContent = currentContent; })
        .catch(err => console.error("Firestore Save Error:", err));
};

// 3. 変更検知 (保存タイマーのみに集中)
editor.on("change", (cm, changeObj) => {
    if (isInternalChange || changeObj.origin === "setValue") return;

    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveToFirebase, 1000);
});
