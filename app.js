import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

/* 🔧 Firebase設定（自分のものに差し替え） */
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "XXXX",
  appId: "XXXX"
};

/* Firebase 初期化 */
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

/* CodeMirror 初期化 */
const cm = CodeMirror.fromTextArea(
  document.getElementById("editor"),
  {
    mode: "markdown",
    lineWrapping: true,
    indentUnit: 2,
    tabSize: 2,
    extraKeys: {
      Tab(cm) {
        cm.execCommand("insertSoftTab");
      },
      "Shift-Tab"(cm) {
        cm.execCommand("indentLess");
      }
    }
  }
);

/* ===== 状態管理 ===== */
let docRef = null;
let saveTimer = null;
let isReady = false;   // ← ★ Firestore 読み込み完了フラグ

/* autosave（準備完了後のみ） */
function scheduleSave() {
  if (!isReady || !docRef) return;

  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    await setDoc(
      docRef,
      {
        content: cm.getValue(),
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
  }, 500);
}

/* 入力検知 */
cm.on("change", () => {
  if (!isReady) return;
  scheduleSave();
});

/* 認証 & 初回読み込み */
onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  docRef = doc(db, "users", user.uid, "memo", "main");

  const snap = await getDoc(docRef);
  if (snap.exists()) {
    cm.setValue(snap.data().content || "");
  } else {
    cm.setValue("");
  }

  isReady = true; // ← ★ ここで初めて保存OK
});

/* 匿名ログイン */
signInAnonymously(auth);