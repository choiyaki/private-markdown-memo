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

/* 🔧 Firebase設定（差し替え） */
const firebaseConfig = {
  apiKey: "AIzaSyA9Mt2PRiF-s6vHj7BG-oQnZObzC5iKMLc",
  authDomain: "private-markdown-memo.firebaseapp.com",
  projectId: "private-markdown-memo",
  storageBucket: "private-markdown-memo.firebasestorage.app",
  messagingSenderId: "832564619748",
  appId: "1:832564619748:web:065b0a87cf25ec070cbff1",
  measurementId: "G-QGLB3CD3Y3"
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

/* 状態管理 */
let isEditing = false;
let saveTimer = null;
let docRef = null;

/* autosave */
function scheduleSave() {
  if (!docRef) return;

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
    isEditing = false;
  }, 500);
}

/* 入力検知 */
cm.on("change", () => {
  isEditing = true;
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
});

/* 匿名ログイン */
signInAnonymously(auth);