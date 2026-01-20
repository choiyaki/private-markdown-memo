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
    if (action === "indent") indent();
    if (action === "outdent") outdent();
    if (action === "up") moveLine(-1);
    if (action === "down") moveLine(1);
    
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
function moveLine(dir) {
  const value = editor.value;
  const pos = editor.selectionStart;

  const lines = value.split("\n");

  let row = value.slice(0, pos).split("\n").length - 1;
  const target = row + dir;

  if (target < 0 || target >= lines.length) return;

  // swap
  [lines[row], lines[target]] = [lines[target], lines[row]];

  editor.value = lines.join("\n");

  // カーソル行を維持
  const col = pos - value.lastIndexOf("\n", pos - 1) - 1;
  let newPos = 0;
  for (let i = 0; i < target; i++) {
    newPos += lines[i].length + 1;
  }
  editor.selectionStart = editor.selectionEnd =
    newPos + Math.min(col, lines[target].length);
}