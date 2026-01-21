import { memoDocRef, setDoc, onSnapshot } from './firebase.js';

const editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
    lineNumbers: true,
    mode: "javascript",
    theme: "dracula",
    lineWrapping: true,
    inputStyle: "contenteditable"
});

// 状態管理用の変数
let lastSyncedContent = ""; // 最後に同期（送信または受信）した内容
let isInternalChange = false; // setValueによる内部書き換え中かどうかのフラグ
let saveTimeout = null;

// 1. 受信処理（徹底的に干渉を防ぐ）
onSnapshot(memoDocRef, (doc) => {
    if (!doc.exists()) return;
    
    const remoteContent = doc.data().content;

    // 以下の場合は同期をスキップする
    // A. リモートの内容が最後に同期した内容と同じ（変化なし）
    // B. 今まさに自分が文字を入力している（フォーカスがある）
    if (remoteContent === lastSyncedContent) return;
    if (editor.hasFocus()) {
        // フォーカスがある間は、内容が「完全に」一致していない場合のみ後で同期を検討する
        // ここで無理に同期しないのが安定のコツです
        return; 
    }

    // 同期実行
    isInternalChange = true;
    const cursor = editor.getCursor();
    editor.setValue(remoteContent);
    editor.setCursor(cursor);
    lastSyncedContent = remoteContent;
    isInternalChange = false;
});

// 2. 保存処理（内容が変わったときだけ送信）
const saveToFirebase = () => {
    const currentContent = editor.getValue();
    
    // 最後に同期した内容と同じなら送信しない（無駄な通信カット）
    if (currentContent === lastSyncedContent) return;

    setDoc(memoDocRef, { content: currentContent }, { merge: true })
        .then(() => {
            lastSyncedContent = currentContent;
            console.log("Synced");
        })
        .catch(err => console.error("Save Error:", err));
};

// 3. 変更検知
editor.on("change", (instance, changeObj) => {
    if (isInternalChange || changeObj.origin === "setValue") return;

    // 保存タイマー（少し長めの800msに設定し、入力の区切りを待つ）
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveToFirebase, 800);
});

// 4. Enterキー（リスト補完 & 即時保存）
editor.on("keydown", (instance, event) => {
    if (event.keyCode === 13) { // Enterキー
        const cursor = instance.getCursor();
        const lineContent = instance.getLine(cursor.line);
        
        // より堅牢な正規表現
        // 1: 行頭の空白, 2: 記号(-*+), 3: チェックボックス部
        const listMatch = lineContent.match(/^(\s*)([-*+] )(\[[ xX]\] )? /) || lineContent.match(/^(\s*)([-*+] )(\[[ xX]\] )?$/);

        if (listMatch) {
            const indent = listMatch[1] || "";
            const bullet = listMatch[2] || "";
            const hasCheckbox = listMatch[3] !== undefined;
            
            // 行がマーカーだけで空（リスト終了）か判定
            const currentMarker = (listMatch[0]).replace(/\s+$/, ""); // 末尾の空白を除去して比較
            if (lineContent.trim() === currentMarker.trim()) {
                // 記号を消す
                instance.replaceRange("", {line: cursor.line, ch: 0}, {line: cursor.line, ch: lineContent.length});
            } else {
                // 次の行のテキストを作成
                // チェックボックスがある場合は常に [ ] (未チェック) を出す
                const nextInsert = hasCheckbox ? `${indent}${bullet}[ ] ` : `${indent}${bullet}`;
                
                setTimeout(() => {
                    instance.replaceSelection(nextInsert);
                }, 10);
            }
        }
        saveToFirebase();
    }
});
