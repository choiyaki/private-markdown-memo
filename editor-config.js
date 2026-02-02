// editor-config.js
import {
    moveLineUp,
    moveLineDown,
    toggleCheckbox,
} from "./toolbar-actions.js";

export function initEditor(initialContent = "") {
  const textarea = document.getElementById("editor");
	textarea.value = initialContent;

  const editor = CodeMirror.fromTextArea(textarea, {
    lineNumbers: false,
    mode: "markdown",
    theme: "default",
    lineWrapping: true,
    inputStyle: "contenteditable",
    spellcheck: false,
    indentUnit: 1,
    tabSize: 1,
    extraKeys: {
      "Enter": (cm) => {
        const cursor = cm.getCursor();
        const lineContent = cm.getLine(cursor.line);
        const listMatch = lineContent.match(
          /^(\s*)([*+-](?:\s\[[ xX]\])?|\[[ xX]\])\s+/
        );

        if (listMatch) {
          const prefixWithSpace = listMatch[0];

          if (lineContent === prefixWithSpace) {
            cm.replaceRange(
              "",
              { line: cursor.line, ch: 0 },
              { line: cursor.line, ch: lineContent.length }
            );
            cm.execCommand("newlineAndIndent");
            return;
          }

          let prefix = listMatch[0];
          if (prefix.includes("[x]") || prefix.includes("[X]")) {
            prefix = prefix.replace(/\[[xX]\]/, "[ ]");
          }
          cm.replaceSelection("\n" + prefix);
        } else {
          cm.execCommand("newlineAndIndent");
        }
      },

		
    "Tab": "indentMore",
    "Shift-Tab": "indentLess",

    "Alt-Up": (cm) => moveLineUp(cm),
    "Alt-Down": (cm) => moveLineDown(cm),

    "Cmd-Enter": (cm) => toggleCheckbox(cm),
		"Ctrl-Enter": (cm) => toggleCheckbox(cm)
		
		

    }
  });

  /* ===== インデント深さ → CSS変数 ===== */
  editor.on("renderLine", (cm, line, elt) => {
    const match = line.text.match(/^(\s*)/);
    const spaceCount = match ? match[1].length : 0;
    const indentUnit = cm.getOption("indentUnit") || 1;
    const level = spaceCount / indentUnit;
    elt.style.setProperty("--indent-level", level);
  });


editor.on("change", () => {
  localStorage.setItem("memo_content", editor.getValue());
});


// ★ ここで1回だけ
applyAppendFromURL(editor);


  return editor;
}



function applyAppendFromURL(editor) {
  const params = new URLSearchParams(location.search);
  const appendText = params.get("append");
  if (!appendText) return;

  const decoded = decodeURIComponent(appendText);
  const doc = editor.getDoc();
  let line = doc.lastLine();

  // 末尾の空行をスキップ
  while (line > 0 && doc.getLine(line).trim() === "") {
    line--;
  }

  const insertLine = line + 1;
  const prefix = "\n\n";
  const insertText = prefix + decoded;

  // ===== editor 反映 =====
  isInternalChange = true;
  editor.replaceRange(
    insertText,
    { line: insertLine, ch: 0 }
  );

  // ===== 🔑 カーソルを append 末尾へ =====
  const lines = insertText.split("\n");
  const cursorLine = insertLine + lines.length - 1;
  const cursorCh = lines[lines.length - 1].length;

  editor.setCursor({ line: cursorLine, ch: cursorCh });
  editor.focus();
  isInternalChange = false;

  // ===== 保存予約 =====
  if (memoDocRef && navigator.onLine) {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveToFirebase, 0);
  }

  // URL を掃除
  history.replaceState(null, "", location.pathname);
}