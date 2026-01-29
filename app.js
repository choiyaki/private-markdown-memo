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

const titleIndicator = document.getElementById("title-indicator");

function showTitleSpinner() {
  titleIndicator?.classList.remove("hidden");
}

function hideTitleSpinner() {
  titleIndicator?.classList.add("hidden");
}

let syncState = "syncing"; // 初期は必ず syncing
renderTitleSyncState();

let baseText = "";
let isOnline = navigator.onLine;

function setSyncState(state) {
  if (syncState === state) return;
  syncState = state;
  renderTitleSyncState();
}

function renderTitleSyncState() {
  if (!titleIndicator) return;

  titleIndicator.classList.remove(
    "hidden",
    "syncing",
    "online",
    "offline"
  );

  titleIndicator.classList.add(syncState);
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

let resumeTimeout = null;

const saveToFirebase = () => {
  if (!memoDocRef) return;

  const currentContent = editor.getValue();
  const currentTitle = titleField.value;

  // 両方同じなら何もしない
  if (
    currentContent === lastSyncedContent &&
    currentTitle === lastSyncedTitle
  ) return;

  setSyncState("syncing"); // ★ 保存開始＝同期中

  setDoc(
    memoDocRef,
    {
      content: currentContent,
      title: currentTitle
    },
    { merge: true }
  )
    .then(() => {
      // ★ Firestore に「確実に」保存された
      lastSyncedContent = currentContent;
      lastSyncedTitle = currentTitle;

    })
    .catch(() => {
      setSyncState("offline"); // ★ 保存失敗
    });
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
  firstSnapshot = true;

  setSyncState("syncing");

  unsubscribeSnapshot = onSnapshot(docRef, (doc) => {
    if (!doc.exists()) return;

    // ===== Firestore snapshot の「正体」を必ず最初に見る =====
    const { fromCache, hasPendingWrites } = doc.metadata;

    // 🔴 オフライン編集中（ローカルキャッシュ + 未同期）
    if (fromCache && hasPendingWrites) {
      setSyncState("offline");
      return;
    }

    // 🌀 同期途中（オンラインだが未確定）
    if (hasPendingWrites) {
      setSyncState("syncing");
      return;
    }

    // 🟢 サーバー確定 snapshot（唯一信用できる）
    setSyncState("online");

    // ===== ここから下は「確定データのみ」 =====
    const data = doc.data();
    const remoteTitle = data.title || "";
    const remoteContent = data.content || "";

    // ===== 初回 snapshot（復帰・再接続時の要） =====
    if (firstSnapshot) {
      firstSnapshot = false;

      const localContent = editor.getValue();

      // タイトルは Firestore 優先
      titleField.value = remoteTitle;
      document.title = remoteTitle || "Debug Memo";

      // ★ オフライン中の「末尾追記」を検出
      if (!isOnline && localContent.startsWith(baseText)) {
        const diff = localContent.slice(baseText.length);

        const merged = remoteContent + diff;

        isInternalChange = true;
        editor.setValue(merged);
        isInternalChange = false;

        // ★ 新しい基準点を確定
        baseText = remoteContent;
        lastSyncedContent = remoteContent;
        lastSyncedTitle = remoteTitle;

        // Firestoreへ反映（1回だけ）
        setSyncState("syncing");
        saveTimeout = setTimeout(saveToFirebase, 300);

        hideTitleSpinner();
        return;
      }

      // ★ diff が信用できない場合は Firestore 優先
      isInternalChange = true;
      editor.setValue(remoteContent);
      isInternalChange = false;

      baseText = remoteContent;
      lastSyncedContent = remoteContent;
      lastSyncedTitle = remoteTitle;

      hideTitleSpinner();
      return;
    }

    // ===== 2回目以降（通常同期） =====

    // 本文：フォーカス外のみ反映
    if (!editor.hasFocus() && remoteContent !== editor.getValue()) {
      isInternalChange = true;
      editor.setValue(remoteContent);
      isInternalChange = false;
    }

    // タイトル
    if (remoteTitle !== titleField.value) {
      titleField.value = remoteTitle;
      document.title = remoteTitle || "Debug Memo";
    }

    // ★ baseText は触らない（重要）
    lastSyncedContent = remoteContent;
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

window.addEventListener("online", () => {
  isOnline = true;
  setSyncState("syncing");

  // Firestoreを読み直す
  if (memoDocRef) {
    startFirestoreSync(memoDocRef);
  }
});

window.addEventListener("offline", () => {
  isOnline = false;
  setSyncState("offline");
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  if (!memoDocRef) return;

  console.log("App resumed");

  // 1. 見た目は一旦同期中
  setSyncState("syncing");

  // 2. snapshot を張り直す
  startFirestoreSync(memoDocRef);

  // 3. 一定時間来なければオフライン扱い
  if (resumeTimeout) clearTimeout(resumeTimeout);
  resumeTimeout = setTimeout(() => {
    if (syncState === "syncing") {
      console.warn("Snapshot timeout → offline");
      setSyncState("offline");
    }
  }, 5000); // 5秒（好みで調整）
});