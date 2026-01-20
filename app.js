import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* ========= Firebase 設定（自分のに置き換え） ========= */
const firebaseConfig = {
  /* your config */
};
/* ==================================================== */

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const editor = document.getElementById("editor");

let isRendering = false;
let saveTimer = null;

/* ---------- 行DOMを描画 ---------- */

function renderLines(text) {
  isRendering = true;
  editor.innerHTML = "";

  const lines = text.split("\n");

  lines.forEach(lineText => {
    const div = document.createElement("div");
    div.className = "line";
    div.contentEditable = "true";
    div.innerText = lineText || "";
    editor.appendChild(div);
  });

  isRendering = false;
}

/* ---------- 行DOM → テキスト ---------- */

function collectText() {
  return Array.from(editor.children)
    .map(line => line.innerText)
    .join("\n");
}

/* ---------- 保存 ---------- */

function saveNow() {
  if (!auth.currentUser) return;

  setDoc(
    doc(db, "users", auth.currentUser.uid, "memo", "main"),
    {
      content: collectText(),
      updatedAt: serverTimestamp()
    }
  );
}

/* ---------- 入力監視（debounce 保存） ---------- */

editor.addEventListener("input", () => {
  if (isRendering) return;

  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveNow();
  }, 500);
});

/* ---------- 認証 & Firestore 読み込み ---------- */

onAuthStateChanged(auth, user => {
  if (!user) {
    signInWithPopup(auth, new GoogleAuthProvider());
    return;
  }

  onSnapshot(
    doc(db, "users", user.uid, "memo", "main"),
    snap => {
      if (!snap.exists()) return;
      if (isRendering) return;

      renderLines(snap.data().content || "");
    }
  );
});