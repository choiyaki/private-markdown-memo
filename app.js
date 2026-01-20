import { db, auth, login } from "./firebase.js";
import { doc, setDoc, onSnapshot, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
	
let isEditing = false;

const editor = document.getElementById("editor");
const preview = document.getElementById("preview");
const loginBtn = document.getElementById("login");

loginBtn.onclick = login;

function saveNow() {
  if (!auth.currentUser) return;

  setDoc(
    doc(db, "users", auth.currentUser.uid, "memo", "main"),
    {
      content: editor.value,
      updatedAt: serverTimestamp()
    }
  );
}

editor.addEventListener("keydown", e => {
  // IME変換中は何もしない（超重要）
  if (e.isComposing) return;

  // Enterキー以外は無視
  if (e.key !== "Enter") return;

  const pos = editor.selectionStart;
  const text = editor.value;

  // 現在行を取得
  const lineStart = text.lastIndexOf("\n", pos - 1) + 1;
  const line = text.slice(lineStart, pos);

  // 箇条書き判定
  const m = line.match(/^(\s*)([-*+]|\d+\.)\s+/);
  if (!m) return;

  // 行が記号だけなら補完しない（- → 改行で終了）
  if (line.trim() === m[0].trim()) return;

  e.preventDefault();

  const indent = m[1];
  const marker = m[2] + " ";

  editor.setRangeText(
    "\n" + indent + marker,
    pos,
    pos,
    "end"
  );
});

onAuthStateChanged(auth, user => {
  if (!user) return;
	
	loginBtn.style.display = "none";
	editor.focus();

  const ref = doc(db, "users", user.uid, "memo", "main");

  onSnapshot(ref, snap => {
  if (!snap.exists()) return;
  if (isEditing) return; // ← ここが核心

  editor.value = snap.data().content;
});

  editor.oninput = debounce(() => {
	  saveNow();
	}, 500);
	});

function debounce(fn, ms) {
  let t;
  return () => {
    clearTimeout(t);
    t = setTimeout(fn, ms);
  };
}

editor.addEventListener("input", () => {
  isEditing = true;
});


document.querySelectorAll("#toolbar button").forEach(btn => {
	btn.onclick = () => {
	  const action = btn.dataset.action;
	
	  if (action === "up") moveLines(-1);
	  if (action === "down") moveLines(1);
	  if (action === "indent") indent();
	  if (action === "outdent") outdent();
	
	  saveNow();
	  editor.focus();
	};
});

function getLines() {
  const value = editor.value;
  const start = editor.selectionStart;
  const end = editor.selectionEnd;

  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const lineEnd =
    value.indexOf("\n", end) === -1
      ? value.length
      : value.indexOf("\n", end);

  return { value, start, end, lineStart, lineEnd };
}

/* インデント */
function indent() {
  const value = editor.value;
  const start = editor.selectionStart;
  const end = editor.selectionEnd;

  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const lineEnd =
    value.indexOf("\n", end) === -1
      ? value.length
      : value.indexOf("\n", end);

  const lines = value.slice(lineStart, lineEnd).split("\n");

  const result = lines.map(l => "\t" + l).join("\n");

  editor.setRangeText(result, lineStart, lineEnd, "end");

  // カーソル・選択を自然に維持
  editor.selectionStart = start + 1;
  editor.selectionEnd = end + lines.length;
}

/* アウトデント */
function outdent() {
  const value = editor.value;
  const start = editor.selectionStart;
  const end = editor.selectionEnd;

  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const lineEnd =
    value.indexOf("\n", end) === -1
      ? value.length
      : value.indexOf("\n", end);

  const lines = value.slice(lineStart, lineEnd).split("\n");

  let removedTabs = 0;
  const result = lines.map(line => {
    if (line.startsWith("\t")) {
      removedTabs++;
      return line.substring(1); // ← 明示的に「タブ1文字だけ」
    }
    return line;
  }).join("\n");

  editor.setRangeText(result, lineStart, lineEnd, "end");

  // カーソル補正（削除されたタブ分だけ戻す）
  editor.selectionStart = Math.max(start - 1, lineStart);
  editor.selectionEnd = Math.max(end - removedTabs, editor.selectionStart);
}

/* 行を上下に移動 */
function moveLines(direction) {
  const value = editor.value;
  let start = editor.selectionStart;
  let end = editor.selectionEnd;

  // 行ブロックの開始・終了
  const blockStart = value.lastIndexOf("\n", start - 1) + 1;
  let blockEnd = value.indexOf("\n", end);
  if (blockEnd === -1) blockEnd = value.length;

  const lines = value.slice(blockStart, blockEnd).split("\n");

  // 上へ移動
  if (direction === -1) {
    if (blockStart === 0) return;

    const prevLineStart = value.lastIndexOf("\n", blockStart - 2) + 1;
    const prevLineEnd = blockStart - 1;
    const prevLine = value.slice(prevLineStart, prevLineEnd);

    const newValue =
      value.slice(0, prevLineStart) +
      lines.join("\n") + "\n" +
      prevLine +
      value.slice(blockEnd);

    editor.value = newValue;

    const newStart = prevLineStart;
    const newEnd = newStart + blockEnd - blockStart;
    editor.setSelectionRange(newStart, newEnd);
  }

  // 下へ移動
  if (direction === 1) {
    if (blockEnd === value.length) return;

    const nextLineStart = blockEnd + 1;
    let nextLineEnd = value.indexOf("\n", nextLineStart);
    if (nextLineEnd === -1) nextLineEnd = value.length;
    const nextLine = value.slice(nextLineStart, nextLineEnd);

    const newValue =
      value.slice(0, blockStart) +
      nextLine + "\n" +
      lines.join("\n") +
      value.slice(nextLineEnd);

    editor.value = newValue;

    const newStart = blockStart + nextLine.length + 1;
    const newEnd = newStart + blockEnd - blockStart;
    editor.setSelectionRange(newStart, newEnd);
  }
}