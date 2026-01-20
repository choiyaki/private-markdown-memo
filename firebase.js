import { initializeApp } from
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, enableIndexedDbPersistence }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

export const app = initializeApp({
  apiKey: "AIzaSyA9Mt2PRiF-s6vHj7BG-oQnZObzC5iKMLc",
  authDomain: "private-markdown-memo.firebaseapp.com",
  projectId: "private-markdown-memo"
});

export const db = getFirestore(app);
enableIndexedDbPersistence(db).catch(()=>{});

export const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export function login() {
  return signInWithPopup(auth, provider);
}