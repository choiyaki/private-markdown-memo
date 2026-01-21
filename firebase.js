import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";


// Firebaseコンソールの「プロジェクト設定」からコピーした内容に置き換えてください
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
const db = getFirestore(app);

// Firestoreの特定のドキュメント（memosコレクションのmainドキュメント）を参照
const memoDocRef = doc(db, "memos", "main");

export { db, memoDocRef, setDoc, onSnapshot };