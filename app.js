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
    wrapText(btn.dataset.insert);
  };
});

function wrapText(mark) {
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  const selected = editor.value.slice(start, end);

  if (selected) {
    // 選択文字を囲む
    editor.setRangeText(
      mark + selected + mark,
      start,
      end,
      "end"
    );
  } else {
    // 空の場合：カーソルを中央に
    editor.setRangeText(
      mark + mark,
      start,
      end,
      "end"
    );
    editor.selectionStart = editor.selectionEnd = start + mark.length;
  }

  editor.focus();
}