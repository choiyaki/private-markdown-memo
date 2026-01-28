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

// app.js の最上部（import直後）
const cachedContent = localStorage.getItem("memo_content") || "";
const cachedTitle = localStorage.getItem("memo_title") || "";

const menuBtn = document.getElementById("menu-btn");
const menuPanel = document.getElementById("menu-panel");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const userInfo = document.getElementById("user-info");

// 1. 初期化
//const editor = initEditor();
const editor = initEditor(cachedContent);
setupToolbar(editor);

// 1. タイトル要素の取得
const titleField = document.getElementById('title-field');

const titleSpinner = document.getElementById("title-spinner");

function showTitleSpinner() {
  titleSpinner?.classList.remove("hidden");
}

function hideTitleSpinner() {
  titleSpinner?.classList.add("hidden");
}

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


titleField.addEventListener("input", () => {
  const currentTitle = titleField.value;
  localStorage.setItem("memo_title", currentTitle);
  document.title = currentTitle || "Debug Memo";

  // ★ Firebaseにも保存（ログイン時のみ）
  if (memoDocRef) {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveToFirebase, 800);
  }
});


// 4. Firebase関連（以前のまま）
let unsubscribeSnapshot = null;
let memoDocRef = null;
let lastSyncedTitle = "";
let lastSyncedContent = "";
let isInternalChange = false;
let saveTimeout = null;

const saveToFirebase = () => {
  if (!memoDocRef) return;

  const currentContent = editor.getValue();
  const currentTitle = titleField.value;

  // 両方同じなら何もしない
  if (
    currentContent === lastSyncedContent &&
    currentTitle === lastSyncedTitle
  ) return;

  setDoc(
    memoDocRef,
    {
      content: currentContent,
      title: currentTitle
    },
    { merge: true }
  )
    .then(() => {
      lastSyncedContent = currentContent;
      lastSyncedTitle = currentTitle;
    })
    .catch(console.error);
};

editor.on("change", (cm, changeObj) => {
    if (isInternalChange || changeObj.origin === "setValue") return;
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveToFirebase, 800);
});

let firstSnapshot = true;

function startFirestoreSync(docRef) {
  stopFirestoreSync();
  memoDocRef = docRef;
  firstSnapshot = true; // ★ 毎回リセット重要

  showTitleSpinner();   // ★ 同期開始で表示

  unsubscribeSnapshot = onSnapshot(docRef, (doc) => {
    if (!doc.exists()) return;

    const data = doc.data();
    const remoteTitle = data.title || "";
    const remoteContent = data.content || "";

    // ★ 初回スナップショットだけ特別扱い
    if (firstSnapshot) {
      // タイトル
      titleField.value = remoteTitle;
      document.title = remoteTitle || "Debug Memo";

      // 本文
      editor.setValue(remoteContent);

      hideTitleSpinner();   // ★ ここで消す
      firstSnapshot = false;
      return;
    }

    // ===== 2回目以降（今まで通り） =====

    // 本文
    if (!editor.hasFocus() && remoteContent !== editor.getValue()) {
      isInternalChange = true;
      editor.setValue(remoteContent);
      isInternalChange = false;
    }
    lastSyncedContent = remoteContent;

    // タイトル
    if (remoteTitle !== titleField.value) {
      titleField.value = remoteTitle;
      document.title = remoteTitle || "Debug Memo";
    }
    lastSyncedTitle = remoteTitle;
  });
}

function stopFirestoreSync() {
  if (unsubscribeSnapshot) {
    unsubscribeSnapshot();
    unsubscribeSnapshot = null;
  }
  memoDocRef = null;
  lastSyncedContent = "";
  lastSyncedTitle = ""; // ← これもリセット
}

onAuthStateChanged(auth, (user) => {
  if (user) {
		showTitleSpinner();
		
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