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

let baseText = "";        // ★ Firestore基準テキスト
let offlineDraft = "";   // ★ オフライン中の全文（任意・デバッグ用）
let firstSnapshot = true;

const saveToFirebase = () => {
  if (!memoDocRef) return;
	if (!navigator.onLine) return;

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
      lastSyncedContent = currentContent;
      lastSyncedTitle = currentTitle;
    })
    .catch(() => {
      setSyncState("offline"); // ★ 失敗したらオフライン
    });
};

editor.on("change", (cm, changeObj) => {
  if (isInternalChange || changeObj.origin === "setValue") return;

  // ★ オフライン中：Firestoreには触らない
  if (!navigator.onLine) {
    offlineDraft = editor.getValue(); // 任意（確認用）
    return;
  }

  // ★ オンライン中のみ保存予約
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(saveToFirebase, 800);
});


function startFirestoreSync(docRef) {
  stopFirestoreSync();
  memoDocRef = docRef;
  firstSnapshot = true;

  setSyncState("syncing");

  unsubscribeSnapshot = onSnapshot(docRef, (doc) => {
    if (!doc.exists()) return;

    const data = doc.data();
    const remoteTitle = data.title || "";
    const remoteContent = data.content || "";

    if (firstSnapshot) {
  const localContent = editor.getValue();

  let mergedContent = remoteContent;

  // ★ オフラインで末尾追記されていた場合だけマージ
  if (localContent.startsWith(baseText)) {
  const diff = localContent.slice(baseText.length);
	alert("d="+diff);
  mergedContent = remoteContent + diff;
}

  isInternalChange = true;
  editor.setValue(mergedContent);
  isInternalChange = false;

  titleField.value = remoteTitle;
  document.title = remoteTitle || "Debug Memo";

  // ★ ここで baseText を確定
  baseText = remoteContent;
	alert("b"+baseText);

  lastSyncedContent = mergedContent;
  lastSyncedTitle = remoteTitle;

  // ★ マージ結果を Firestore に反映（オンライン時のみ）
  if (navigator.onLine && mergedContent !== remoteContent) {
    setSyncState("syncing");
    saveTimeout = setTimeout(saveToFirebase, 300);
  }

  firstSnapshot = false;
  hideTitleSpinner();
  setSyncState("online");
  return;
}

    // 2回目以降
if (!editor.hasFocus() && remoteContent !== editor.getValue()) {
  isInternalChange = true;
  editor.setValue(remoteContent);
  isInternalChange = false;
}

// Firestoreで確定した内容
lastSyncedContent = remoteContent;
lastSyncedTitle = remoteTitle;

// ★ ここが重要
baseText = remoteContent;
		
		if (
  syncState === "syncing" &&
  remoteContent === lastSyncedContent &&
  remoteTitle === lastSyncedTitle
) {
  setSyncState("online");
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

window.addEventListener("offline", () => {
  setSyncState("offline");
});

window.addEventListener("online", () => {
  if (memoDocRef) {
    setSyncState("syncing"); // ★ onlineにはしない
    startFirestoreSync(memoDocRef);
  }
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