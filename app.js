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

/*
========================================
 Invariants（同期設計の不変条件）
========================================

Invariant 0:
  Firestore 上の content は常に 1 つだけ存在し、
  分岐・履歴・マージは扱わない

Invariant 1:
  baseText は同期完了まで編集されない
  編集可能なのは baseText 以降（diff）のみ

Invariant 2:
  baseText は
  「Firestore と editor の両方が同意している最新履歴」である

Invariant 3:
  diff = editorContent - baseText
  baseText 更新時、diff は必ず空になる

Invariant 4:
  first snapshot 到着時点で remoteContent は
  この端末が採用すべき唯一の真実とする
========================================
*/

// app.js の最上部（import直後）
const cachedContent = localStorage.getItem("memo_content") || "";
const cachedTitle = localStorage.getItem("memo_title") || "";
const cachedBaseText = localStorage.getItem("memo_baseText") || "";

const menuBtn = document.getElementById("menu-btn");
const menuPanel = document.getElementById("menu-panel");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const userInfo = document.getElementById("user-info");

let isIMEComposing = false;
let pendingCommit = null;

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

  // ✅ 一旦ここまで戻す
	if (state === "online") {
	  clearBaseTextMark();
	} else {
	  applyBaseTextMark();
	}
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
		// ★ 起動時専用：状態遷移は起こさない
  if (syncState !== "online") {
    applyBaseTextMark();
  }

  renderTitleSyncState();
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

let baseText = cachedBaseText;   // ★ ローカル保存された基準
let firstSnapshot = true;
let baseTextIsAuthoritative = false; // ★ Firestoreとeditorが一致しているか
let baseTextMark = null;
let baseTextLineHandles = [];

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

  // オフライン中：Firestoreには触らない
  if (!navigator.onLine) {
    
    return;
  }

  // オンライン中のみ保存予約
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(saveToFirebase, 800);
});


function startFirestoreSync(docRef) {
  stopFirestoreSync();
  memoDocRef = docRef;
  firstSnapshot = true;

  // ★ Firestoreとまだ一致していない
  baseTextIsAuthoritative = false;

  setSyncState("syncing");

  unsubscribeSnapshot = onSnapshot(docRef, (doc) => {
    if (!doc.exists()) return;

    const data = doc.data();
    const remoteTitle = data.title || "";
    const remoteContent = data.content || "";

    // ===== 初回 snapshot =====
		if (firstSnapshot) {
		  // Invariant 4:
		  // remoteContent は唯一の真実
		  requestCommit(() => commitSync(remoteContent));
		
		  // タイトル
		  titleField.value = remoteTitle;
		  document.title = remoteTitle || "Debug Memo";
		  lastSyncedTitle = remoteTitle;
		
		  firstSnapshot = false;
		  hideTitleSpinner();
		  setSyncState("online");
		  return;
		}
    // ===== 2回目以降 =====

		// diff があるなら snapshot は無視
		if (diffExists()) {
  		return;
		}
		// diff がない場合のみ同期確定
		if (remoteContent !== baseText) {
  		// ❌ 直接呼ばない
// commitSync(remoteContent);

// ✅ 必ず requestCommit 経由
requestCommit(() => {
  if (remoteContent !== baseText && !diffExists()) {
    commitSync(remoteContent);
  }
}); // ← これでよい
		}

		lastSyncedTitle = remoteTitle;
		
		if (syncState === "syncing") {
		  setSyncState("online");
		}
  });
}

function requestCommit(fn) {
  if (isIMEComposing) {
    // IME中は「最後の1回だけ」保持
    pendingCommit = fn;
    return;
  }
  fn();
}

async function commitInitialSync({ remoteContent, remoteTitle }) {
  // ========================================
  // Sync Commit Phase (Immediate Save)
  // ========================================

  // Invariant 4:
  // remoteContent は唯一の真実
  const localContent = editor.getValue();
  let mergedContent = remoteContent;

  // Invariant 3:
  // diff = editorContent - baseText
  if (
    !baseTextIsAuthoritative &&
    baseText &&
    localContent.startsWith(baseText)
  ) {
    const diff = localContent.slice(baseText.length);
    mergedContent = remoteContent + diff;
  }

  // editor に即反映
  isInternalChange = true;
  editor.setValue(mergedContent);
  isInternalChange = false;

  // タイトル反映
  titleField.value = remoteTitle;
  document.title = remoteTitle || "Debug Memo";

  // Invariant 2:
  // Firestore と editor が同意する内容
  baseText = mergedContent;
  baseTextIsAuthoritative = true;
  localStorage.setItem("memo_baseText", baseText);

  try {
    // ★ 即 Firestore に確定保存
    await setDoc(
      memoDocRef,
      {
        content: mergedContent,
        title: remoteTitle
      },
      { merge: true }
    );

    lastSyncedContent = mergedContent;
    lastSyncedTitle = remoteTitle;

    firstSnapshot = false;
    hideTitleSpinner();
    setSyncState("online");

  } catch (e) {
    console.error("Initial sync save failed", e);
    setSyncState("offline");
  }
}

const imeIndicator = document.getElementById("ime-indicator");

const input = editor.getInputField();

input.addEventListener("compositionstart", () => {
  isIMEComposing = true;
  showIMEIndicator();
});

input.addEventListener("compositionend", () => {
  isIMEComposing = false;
  hideIMEIndicator();

  // ★ IME終了後に保留していた commit を実行
  if (pendingCommit) {
    pendingCommit();
    pendingCommit = null;
  }
});


/**
 * 同期確定フェーズ
 * Invariant:
 *  - baseText を更新する
 *  - diff は必ず空になる
 */
function commitSync(remoteContent) {
  // ★ IME中なら即反映しない
  if (isIMEComposing) {
    pendingRemoteContent = remoteContent;
    return;
  }

  const localContent = editor.getValue();
  let merged = remoteContent;

  if (baseText && localContent.startsWith(baseText)) {
    const diff = localContent.slice(baseText.length);
    merged = remoteContent + diff;
  }

  isInternalChange = true;
  editor.setValue(merged);
  isInternalChange = false;

  baseText = merged;
  baseTextIsAuthoritative = true;
  localStorage.setItem("memo_baseText", baseText);

  lastSyncedContent = merged;
  saveTimeout = setTimeout(saveToFirebase, 0);
}

/**
 * 通常反映フェーズ
 * Invariant:
 *  - baseText は更新しない
 *  - diff を壊さない
 */
/*
function applyRemoteViewOnly(remoteContent) {
  isInternalChange = true;
  editor.setValue(remoteContent);
  isInternalChange = false;

  // ❌ baseText は触らない
  lastSyncedContent = remoteContent;
}
*/
function diffExists() {
  return editor.getValue() !== baseText;
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


function applyBaseTextMark() {
  clearBaseTextMark();
  if (!baseText) return;

  const endPos = editor.posFromIndex(baseText.length);

  // === 文字単位（baseText 全体）===
  baseTextMark = editor.markText(
    { line: 0, ch: 0 },
    endPos,
    {
      className: "cm-baseText",
      inclusiveLeft: false,
      inclusiveRight: false
    }
  );

  // === 行単位（最終行「手前」まで）===
  for (let line = 0; line < endPos.line; line++) {
    editor.addLineClass(line, "background", "cm-baseText-line");
    baseTextLineHandles.push(line);
  }
}

function clearBaseTextMark() {
  if (baseTextMark) {
    baseTextMark.clear();
    baseTextMark = null;
  }

  for (const line of baseTextLineHandles) {
    editor.removeLineClass(line, "background", "cm-baseText-line");
  }
  baseTextLineHandles = [];
}

function applyRemote(content) {
  isInternalChange = true;
  editor.setValue(content);
  isInternalChange = false;

  baseText = content;
  baseTextIsAuthoritative = true;
  localStorage.setItem("memo_baseText", baseText);

  lastSyncedContent = content;
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