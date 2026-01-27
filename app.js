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

// 追記判定
function isAppendOnly(local, remote) {
  return remote.startsWith(local);
}

// 追記マージ
function mergeAppend(local, remote) {
  const appended = remote.slice(local.length);

  editor.replaceRange(
    appended,
    editor.posFromIndex(local.length)
  );

  lastSyncedContent = remote;
}

// 競合処理
function showConflict(remote) {
  console.warn("⚠️ 競合発生");

  // 非破壊：下に積む
  editor.replaceRange(
    "\n\n---\n[PCで更新された内容]\n" + remote,
    editor.getCursor()
  );
}



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
let hasLocalEditAfterLaunch = false;

editor.on("change", () => {
  hasLocalEditAfterLaunch = true;
});

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

function startFirestoreSync(docRef) {
  stopFirestoreSync();
  memoDocRef = docRef;

  unsubscribeSnapshot = onSnapshot(docRef, (doc) => {
    if (!doc.exists()) return;

    const remote = doc.data().content || "";
    const local = editor.getValue();

    // ① 初回 or ローカル未編集 → そのまま反映
    if (!hasLocalEditAfterLaunch) {
      isInternalChange = true;
      editor.setValue(remote);
      isInternalChange = false;

      lastSyncedContent = remote;
      return;
    }

    // ② 追記なら自動マージ
    if (isAppendOnly(local, remote)) {
      const appended = remote.slice(local.length);

      editor.replaceRange(
        appended,
        editor.posFromIndex(local.length)
      );

      lastSyncedContent = remote;
      return;
    }

    // ③ それ以外は競合
    showConflict(remote);
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