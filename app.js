import { db, auth, login } from "./firebase.js";
import { doc, setDoc, onSnapshot, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const editor = document.getElementById("editor");
const preview = document.getElementById("preview");
const loginBtn = document.getElementById("login");

loginBtn.onclick = login;

onAuthStateChanged(auth, user => {
  if (!user) return;

  const ref = doc(db, "users", user.uid, "memo", "main");

  onSnapshot(ref, snap => {
    if (snap.exists()) {
      editor.value = snap.data().content;
      preview.innerHTML = marked.parse(editor.value);
    }
  });

  editor.oninput = debounce(() => {
    setDoc(ref, {
      content: editor.value,
      updatedAt: serverTimestamp()
    });
    preview.innerHTML = marked.parse(editor.value);
  }, 400);
});

function debounce(fn, ms) {
  let t;
  return () => {
    clearTimeout(t);
    t = setTimeout(fn, ms);
  };
}