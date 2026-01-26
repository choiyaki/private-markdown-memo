import { setDoc, onSnapshot } from './firebase.js';
import { initEditor } from './editor-config.js';
import { setupToolbar } from './toolbar-actions.js';
import {
  auth,
  provider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "./firebase.js";

import { getUserMemoRef } from "./firebase.js";


const menuBtn = document.getElementById("menu-btn");
const menuPanel = document.getElementById("menu-panel");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const userInfo = document.getElementById("user-info");

// 1. 初期化
const editor = initEditor();
setupToolbar(editor);

// 1. タイトル要素の取得
const titleField = document.getElementById('title-field');

menuBtn.addEventListener("click", () => {
  menuPanel.hidden = !menuPanel.hidden;
});

loginBtn.addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, provider);
    menuPanel.hidden = true;
  } catch (e) {
    console.error(e);
  }
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  menuPanel.hidden = true;
});

// 2. ページ読み込み時に保存された内容を復元
window.addEventListener('DOMContentLoaded', () => {
    const savedTitle = localStorage.getItem('memo_title');
    if (savedTitle) {
        titleField.value = savedTitle;
    }
});

// 3. 入力されるたびに保存（同期）
titleField.addEventListener('input', () => {
    const currentTitle = titleField.value;
    localStorage.setItem('memo_title', currentTitle);
    
    // 必要であれば、ここでページタイトル(ブラウザのタブ名)も更新
    document.title = currentTitle || "Debug Memo";
});


// 4. Firebase関連（以前のまま）
let unsubscribeSnapshot = null;
let memoDocRef = null;
let lastSyncedContent = "";
let isInternalChange = false;
let saveTimeout = null;

const saveToFirebase = () => {
  if (!memoDocRef) return;

  const current = editor.getValue();
  if (current === lastSyncedContent) return;

  setDoc(memoDocRef, { content: current }, { merge: true })
    .then(() => {
      lastSyncedContent = current;
    })
    .catch(console.error);
};

editor.on("change", (cm, changeObj) => {
    if (isInternalChange || changeObj.origin === "setValue") return;
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveToFirebase, 800);
});

function startFirestoreSync(docRef) {
  stopFirestoreSync();
  memoDocRef = docRef;

  unsubscribeSnapshot = onSnapshot(docRef, (doc) => {
    if (!doc.exists()) return;

    const remote = doc.data().content || "";
    if (remote === editor.getValue()) {
      lastSyncedContent = remote;
      return;
    }

    if (!editor.hasFocus()) {
      isInternalChange = true;
      editor.setValue(remote);
      lastSyncedContent = remote;
      isInternalChange = false;
    }
  });
}

function stopFirestoreSync() {
  if (unsubscribeSnapshot) {
    unsubscribeSnapshot();
    unsubscribeSnapshot = null;
  }
  memoDocRef = null;
  lastSyncedContent = "";
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    loginBtn.hidden = true;
    logoutBtn.hidden = false;
    userInfo.textContent = user.displayName;

    // ★ ユーザー専用メモに切り替え
    const ref = getUserMemoRef(user.uid);
    startFirestoreSync(ref);

  } else {
    loginBtn.hidden = false;
    logoutBtn.hidden = true;
    userInfo.textContent = "";

    // ★ 同期停止（ローカルのみ）
    stopFirestoreSync();
  }
});