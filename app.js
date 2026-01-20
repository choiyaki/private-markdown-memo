import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { EditorView, basicSetup } from "https://esm.sh/codemirror";

const firebaseConfig = { /* あなたの設定 */ };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const docRef = doc(db, "memos", "shared-note");

let isRemoteUpdate = false;

const editor = new EditorView({
    doc: "読み込み中...",
    extensions: [
        basicSetup,
        EditorView.updateListener.of((update) => {
            if (update.docChanged && !isRemoteUpdate) {
                const newText = update.state.doc.toString();
                // 1秒待たずに即時保存（テストのため）
                setDoc(docRef, { text: newText }).catch(e => console.error("保存エラー:", e));
            }
        })
    ],
    parent: document.getElementById("editor")
});

// データの読み込み
onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
        const data = docSnap.data().text;
        const currentText = editor.state.doc.toString();
        if (data !== currentText) {
            isRemoteUpdate = true;
            editor.dispatch({
                changes: { from: 0, to: currentText.length, insert: data }
            });
            isRemoteUpdate = false;
        }
    } else {
        // 初めて使う時の初期化
        setDoc(docRef, { text: "ここにメモを書いてください" });
    }
}, (error) => {
    console.error("読み込みエラー（ルールを確認してください）:", error);
});
