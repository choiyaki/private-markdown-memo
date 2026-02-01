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

  const doc = editor.getDoc();
  const lastLine = doc.lastLine();
  const lastCh = doc.getLine(lastLine).length;
  const lastLineText = doc.getLine(lastLine);

  const prefix = lastLineText.length === 0 ? "" : "\n\n";

  editor.replaceRange(
    prefix + appendText,
    { line: lastLine, ch: lastCh }
  );

  history.replaceState(null, "", location.pathname);
}