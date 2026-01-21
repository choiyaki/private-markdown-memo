import { memoDocRef, setDoc, onSnapshot } from './firebase.js';

let editor;
let lastSyncedContent = "";
let isInternalChange = false;
let saveTimeout = null;

try {
    editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
        lineNumbers: true,
        mode: "gfm",
        theme: "dracula",
        lineWrapping: true,
        inputStyle: "contenteditable",
        indentUnit: 2,         
        smartIndent: true,     
        tabSize: 2,            
        // ★ ここに「折り返し時のインデント」を制御するオプションを追加
        lineWiseCopyCut: true,
        viewportMargin: Infinity, // 全体をレンダリング対象にして計算を安定させる

        extraKeys: {
            "Enter": (cm) => {
                cm.execCommand("newlineAndIndent");
                const cursor = cm.getCursor();
                const prevLine = cm.getLine(cursor.line - 1);
                const match = prevLine.match(/^(\s*)([-*+] )(\[[ xX]\] )?/);
                if (match) {
                    const [full, indent, bullet, checkbox] = match;
                    if (prevLine.trim() === (bullet + (checkbox || "")).trim()) {
                        cm.replaceRange("", {line: cursor.line - 1, ch: 0}, {line: cursor.line - 1, ch: prevLine.length});
                    } else {
                        cm.replaceSelection(bullet + (checkbox ? "[ ] " : ""));
                    }
                }
            }
        }
    });

    // ★ 行頭を揃えるための動的レンダリング設定
    // リストの記号（- [ ] ）の幅を計算し、2行目以降にその分の余白を付与します
    editor.on("renderLine", (cm, line, elt) => {
        const match = line.text.match(/^(\s*)([-*+] )(\[[ xX]\] )?/);
        if (match) {
            const off = CodeMirror.countColumn(match[0], null, cm.getOption("tabSize"));
            elt.style.paddingLeft = off + "ch";
            elt.style.textIndent = "-" + off + "ch";
        } else {
            elt.style.paddingLeft = "";
            elt.style.textIndent = "";
        }
    });
    
    // 設定変更を反映
    editor.refresh();

} catch (error) {
    console.error("Initialization error:", error);
}

// --- 同期ロジックの改善点 ---

// 1. Firebaseからの受信（初期読み込みを最優先）
onSnapshot(memoDocRef, (doc) => {
    if (!doc.exists()) {
        console.log("No document found in Firestore");
        return;
    }
    
    const remoteContent = doc.data().content || "";

    // A. 自分の手元の内容とリモートが既に同じなら何もしない
    if (remoteContent === editor.getValue()) {
        lastSyncedContent = remoteContent;
        return;
    }

    // B. 入力中（フォーカスあり）かつ、内容が「空」でない場合は、
    // 編集中の文字が消えるのを防ぐため、外部からの上書きを一旦スキップする
    if (editor.hasFocus() && editor.getValue() !== "") {
        return;
    }

    // C. 反映処理
    isInternalChange = true;
    const cursor = editor.getCursor();
    editor.setValue(remoteContent);
    editor.setCursor(cursor);
    lastSyncedContent = remoteContent;
    isInternalChange = false;
    console.log("Remote content loaded successfully");
});

// 2. Firebaseへの送信
const saveToFirebase = () => {
    const currentContent = editor.getValue();
    
    // 内容が空でなく、かつ最後に同期した内容と違う場合のみ送信
    if (currentContent === lastSyncedContent) return;

    setDoc(memoDocRef, { content: currentContent }, { merge: true })
        .then(() => {
            lastSyncedContent = currentContent;
            console.log("Saved to Firestore");
        })
        .catch((err) => console.error("Save error:", err));
};

// 3. 変更検知
editor.on("change", (cm, changeObj) => {
    // 受信（setValue）による変更時は保存を発動させない
    if (isInternalChange || changeObj.origin === "setValue") return;

    if (saveTimeout) clearTimeout(saveTimeout);
    // 保存までの時間を 800ms に調整（少し早める）
    saveTimeout = setTimeout(saveToFirebase, 800);
});
