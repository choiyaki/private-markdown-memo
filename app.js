// CDN経由で確実に読み込めるURLに変更します
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// CodeMirror関連をesm.shからインポート
import { EditorView, basicSetup } from "https://esm.sh/codemirror";
import { EditorState } from "https://esm.sh/@codemirror/state";


// --- 1. Firebaseの設定 (あなたのコンソールからコピーした内容に書き換えてください) ---
const firebaseConfig = {
  apiKey: "AIzaSyA9Mt2PRiF-s6vHj7BG-oQnZObzC5iKMLc",
  authDomain: "private-markdown-memo.firebaseapp.com",
  projectId: "private-markdown-memo",
  storageBucket: "private-markdown-memo.firebasestorage.app",
  messagingSenderId: "832564619748",
  appId: "1:832564619748:web:065b0a87cf25ec070cbff1",
  measurementId: "G-QGLB3CD3Y3"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const memoRef = ref(db, 'shared_memo/text');

// --- 2. CodeMirrorの初期化 ---
let isRemoteUpdate = false; // ループ防止フラグ

const editor = new EditorView({
    doc: "",
    extensions: [
        basicSetup,
        EditorView.updateListener.of((update) => {
            // ユーザーが自分で入力した時だけFirebaseに保存
            if (update.docChanged && !isRemoteUpdate) {
                const newText = update.state.doc.toString();
                set(memoRef, newText);
            }
        })
    ],
    parent: document.getElementById("editor")
});

// --- 3. Firebaseからのデータ同期受信 ---
onValue(memoRef, (snapshot) => {
    const data = snapshot.val();
    if (data !== null) {
        const currentText = editor.state.doc.toString();
        
        // ローカルの内容と異なる場合のみ反映
        if (data !== currentText) {
            isRemoteUpdate = true; // 更新中にupdateListenerが反応しないようにする
            editor.dispatch({
                changes: { from: 0, to: currentText.length, insert: data }
            });
            isRemoteUpdate = false;
        }
    }
    document.getElementById("status").innerText = "同期済み";
});
