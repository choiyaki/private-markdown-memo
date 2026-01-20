import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
// Firestore用のインポート
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { EditorView, basicSetup } from "https://esm.sh/codemirror";

// --- 1. Firebase設定 ---
const firebaseConfig = {
    apiKey: "...",
    authDomain: "...",
    projectId: "...",
    // Firestoreの場合、databaseURLは不要ですが、あっても問題ありません
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const docRef = doc(db, "memos", "my-memo"); // 「memos」コレクションの「my-memo」という書類

// --- 2. CodeMirrorの初期化 ---
let isRemoteUpdate = false;
let timeoutId = null;

const editor = new EditorView({
    doc: "",
    extensions: [
        basicSetup,
        EditorView.updateListener.of((update) => {
            if (update.docChanged && !isRemoteUpdate) {
                // 【デバウンス処理】入力が止まって1秒後に送信
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    const newText = update.state.doc.toString();
                    saveToFirestore(newText);
                }, 1000); 
            }
        })
    ],
    parent: document.getElementById("editor")
});

// 保存処理
async function saveToFirestore(content) {
    try {
        await setDoc(docRef, { text: content, updatedAt: new Date() });
        document.getElementById("status").innerText = "保存完了";
    } catch (e) {
        console.error("保存失敗:", e);
    }
}

// --- 3. Firestoreからの読み込み ---
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
            document.getElementById("status").innerText = "同期済み";
        }
    }
});
