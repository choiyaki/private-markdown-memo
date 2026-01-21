import { memoDocRef, setDoc, onSnapshot } from './firebase.js';

let editor;
let lastSyncedContent = "";
let isInternalChange = false;
let saveTimeout = null;

try {
    // ① エディタの初期化（既存のコード）
    editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
        lineNumbers: true,
        mode: "gfm",
        theme: "dracula",
        lineWrapping: true,
        inputStyle: "contenteditable",
        indentUnit: 2,         
        smartIndent: true,     
        tabSize: 2,            
        lineWiseCopyCut: true,
        viewportMargin: Infinity, 
        extraKeys: {
            "Enter": (cm) => {
                /* 改行ロジック（そのまま） */
            }
        }
    });

    // ② ここに「renderLine」の処理を追記します
    editor.on("renderLine", (cm, line, elt) => {
        // インデント・記号・チェックボックス・その後のスペースまでをマッチング
        const match = line.text.match(/^(\s*[-*+] )(\[[ xX]\] )?/);
        
        if (match) {
            const fullMarker = match[0];
            const length = fullMarker.length;
            
            // 文字幅(ch)を使って、1行目の突き出しと2行目以降の揃えを設定
            elt.style.paddingLeft = length + "ch";
            elt.style.textIndent = "-" + length + "ch";
        } else {
            elt.style.paddingLeft = "";
            elt.style.textIndent = "";
        }
    });

    // ③ 設定を即時反映（既存のコードの最後の方へ）
    editor.refresh();

    console.log("CodeMirror initialized with hanging indent");
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

// --- ツールバーボタンの機能実装 ---

// インデント（右へ移動）
document.getElementById("indent-btn").addEventListener("click", () => {
    // 選択範囲、またはカーソル行をインデント
    editor.execCommand("indentMore");
    editor.focus(); // 動作後にエディタにフォーカスを戻す
});

// アウトデント（左へ移動）
document.getElementById("outdent-btn").addEventListener("click", () => {
    // 選択範囲、またはカーソル行のインデントを減らす
    editor.execCommand("indentLess");
    editor.focus(); // 動作後にエディタにフォーカスを戻す
});

// 行を上へ移動
document.getElementById("move-up-btn").addEventListener("click", () => {
    const cursor = editor.getCursor();
    const line = cursor.line;
    if (line > 0) {
        // 現在の行と上の行の内容を入れ替える
        const currentText = editor.getLine(line);
        const prevText = editor.getLine(line - 1);
        
        editor.replaceRange(currentText, {line: line - 1, ch: 0}, {line: line - 1, ch: prevText.length});
        editor.replaceRange(prevText, {line: line, ch: 0}, {line: line, ch: currentText.length});
        
        // カーソルも一緒に移動
        editor.setCursor({line: line - 1, ch: cursor.ch});
    }
    editor.focus();
});

// 行を下へ移動
document.getElementById("move-down-btn").addEventListener("click", () => {
    const cursor = editor.getCursor();
    const line = cursor.line;
    const lastLine = editor.lineCount() - 1;
    if (line < lastLine) {
        // 現在の行と下の行の内容を入れ替える
        const currentText = editor.getLine(line);
        const nextText = editor.getLine(line + 1);
        
        editor.replaceRange(currentText, {line: line + 1, ch: 0}, {line: line + 1, ch: nextText.length});
        editor.replaceRange(nextText, {line: line, ch: 0}, {line: line, ch: currentText.length});
        
        // カーソルも一緒に移動
        editor.setCursor({line: line + 1, ch: cursor.ch});
    }
    editor.focus();
});


// 3. 変更検知
editor.on("change", (cm, changeObj) => {
    // 受信（setValue）による変更時は保存を発動させない
    if (isInternalChange || changeObj.origin === "setValue") return;

    if (saveTimeout) clearTimeout(saveTimeout);
    // 保存までの時間を 800ms に調整（少し早める）
    saveTimeout = setTimeout(saveToFirebase, 800);
});
