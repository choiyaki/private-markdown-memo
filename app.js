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
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* Firebase config（あなたのものに置き換え） */
const firebaseConfig = {
  /* ... */
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const editor = document.getElementById("editor");

let isEditing = false;
let debounceTimer = null;

/* ---------- 保存 ---------- */

function saveNow() {
  if (!auth.currentUser) return;

  setDoc(
    doc(db, "users", auth.currentUser.uid, "memo", "main"),
    {
      content: editor.innerText,
      updatedAt: serverTimestamp()
    }
  );
}

/* debounce 保存 */
editor.addEventListener("input", () => {
  isEditing = true;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    saveNow();
    isEditing = false;
  }, 500);
});

/* ---------- Firestore 読み込み ---------- */

onAuthStateChanged(auth, user => {
  if (!user) {
    signInWithPopup(auth, new GoogleAuthProvider());
    return;
  }

  onSnapshot(
    doc(db, "users", user.uid, "memo", "main"),
    snap => {
      if (!snap.exists()) return;
      if (isEditing) return;

      editor.innerText = snap.data().content || "";
    }
  );
});

/* ---------- エディタ操作 ---------- */

function indent() {
  document.execCommand("insertText", false, "\t");
}

function outdent() {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;

  const range = sel.getRangeAt(0);
  const text = range.startContainer.textContent;
  const offset = range.startOffset;

  if (offset > 0 && text[offset - 1] === "\t") {
    range.startContainer.textContent =
      text.slice(0, offset - 1) + text.slice(offset);
    range.setStart(range.startContainer, offset - 1);
    range.collapse(true);
  }
}

function moveLines(direction) {
  const text = editor.innerText;
  const lines = text.split("\n");

  const sel = window.getSelection();
  const pos = sel.anchorOffset;

  let lineIndex = text.slice(0, pos).split("\n").length - 1;

  if (direction === -1 && lineIndex === 0) return;
  if (direction === 1 && lineIndex === lines.length - 1) return;

  const target = direction === -1 ? lineIndex - 1 : lineIndex + 1;
  [lines[lineIndex], lines[target]] = [lines[target], lines[lineIndex]];

  editor.innerText = lines.join("\n");

  saveNow();
}

/* ---------- ツールバー ---------- */

document.querySelectorAll("#toolbar button").forEach(btn => {
  btn.onclick = () => {
    const action = btn.dataset.action;

    if (action === "indent") indent();
    if (action === "outdent") outdent();
    if (action === "up") moveLines(-1);
    if (action === "down") moveLines(1);

    saveNow();
    editor.focus();
  };
});