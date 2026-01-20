/* =========================
   CodeMirror 6
========================= */
import { EditorState } from "https://unpkg.com/@codemirror/state@6.4.1/dist/index.js";
import { EditorView } from "https://unpkg.com/@codemirror/view@6.24.1/dist/index.js";
import { markdown } from "https://unpkg.com/@codemirror/lang-markdown@6.2.5/dist/index.js";

/* =========================
   Firebase
========================= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

/* 🔧 Firebase config（差し替え） */
const firebaseConfig = {
  apiKey: "AIzaSyA9Mt2PRiF-s6vHj7BG-oQnZObzC5iKMLc",
  authDomain: "private-markdown-memo.firebaseapp.com",
  projectId: "private-markdown-memo",
  appId: "1:832564619748:web:065b0a87cf25ec070cbff1"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* =========================
   Editor
========================= */
let view = null;
let docRef = null;
let ready = false;

function createEditor(content) {
  const state = EditorState.create({
    doc: content,
    extensions: [
      markdown(),
      EditorView.lineWrapping
    ]
  });

  view = new EditorView({
    state,
    parent: document.getElementById("editor")
  });
}

/* =========================
   Login
========================= */
const loginBtn = document.getElementById("loginBtn");

loginBtn.onclick = async () => {
  const provider = new GoogleAuthProvider();
  await signInWithPopup(auth, provider);
};

/* =========================
   Auth → Load data
========================= */
onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  loginBtn.style.display = "none";

  docRef = doc(db, "users", user.uid, "memo", "main");
  const snap = await getDoc(docRef);

  const content = snap.exists() ? snap.data().content : "";
  createEditor(content);

  ready = true;
});

/* =========================
   Save (manual autosave)
========================= */
setInterval(async () => {
  if (!ready || !view || !docRef) return;

  await setDoc(docRef, {
    content: view.state.doc.toString()
  });
}, 1000);