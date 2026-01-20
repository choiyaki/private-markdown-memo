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

editor.addEventListener("input", () => {
  isEditing = true;
});


document.querySelectorAll("#toolbar button").forEach(btn => {
  btn.onclick = () => {
    const action = btn.dataset.action;
    if (action === "indent") indent();
    if (action === "outdent") outdent();
    if (action === "up") moveLine(-1);
    if (action === "down") moveLine(1);
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

/* インデント（2スペース） */
function indent() {
  const { value, lineStart, lineEnd } = getLines();
  const lines = value.slice(lineStart, lineEnd).split("\n");

  const indented = lines.map(l => "  " + l).join("\n");

  editor.setRangeText(indented, lineStart, lineEnd, "end");
}

/* アウトデント */
function outdent() {
  const { value, lineStart, lineEnd } = getLines();
  const lines = value.slice(lineStart, lineEnd).split("\n");

  const outdented = lines
    .map(l => l.startsWith("  ") ? l.slice(2) : l)
    .join("\n");

  editor.setRangeText(outdented, lineStart, lineEnd, "end");
}

/* 行を上下に移動 */
function moveLine(dir) {
  const value = editor.value;
  const pos = editor.selectionStart;

  const start = value.lastIndexOf("\n", pos - 1) + 1;
  const end =
    value.indexOf("\n", pos) === -1
      ? value.length
      : value.indexOf("\n", pos);

  const line = value.slice(start, end);

  const before = value.slice(0, start);
  const after = value.slice(end + 1);

  const prevEnd = before.lastIndexOf("\n", before.length - 2);
  const nextStart = after.indexOf("\n");

  if (dir === -1 && prevEnd >= 0) {
    // 上へ
    const prevStart = before.lastIndexOf("\n", prevEnd - 1) + 1;
    const prevLine = before.slice(prevStart, prevEnd);

    editor.value =
      value.slice(0, prevStart) +
      line + "\n" +
      prevLine +
      value.slice(end);

    editor.selectionStart = editor.selectionEnd = prevStart;
  }

  if (dir === 1 && nextStart !== -1) {
    // 下へ
    const nextLine = after.slice(0, nextStart);

    editor.value =
      before +
      nextLine + "\n" +
      line +
      after.slice(nextStart);

    editor.selectionStart = editor.selectionEnd =
      before.length + nextLine.length + 1;
  }
}