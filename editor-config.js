export function initEditor() {
  const textarea = document.getElementById("editor");

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
      }
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

  /* ===== エディタ高さ調整（前回分） ===== */
  const editorContainer = document.getElementById("editor-container");

  function resizeEditorForKeyboard() {
  if (!window.visualViewport) return;

  const vv = window.visualViewport;

  let keyboardOverlap =
    window.innerHeight - (vv.height + vv.offsetTop);

  if (keyboardOverlap < 0) keyboardOverlap = 0;
  if (keyboardOverlap > window.innerHeight) return;

  editorContainer.style.bottom = `${keyboardOverlap}px`;

  // ★ refreshだけ。scrollはしない
  editor.refresh();
}

  window.visualViewport?.addEventListener("resize", resizeEditorForKeyboard);
  window.visualViewport?.addEventListener("scroll", resizeEditorForKeyboard);

  setTimeout(resizeEditorForKeyboard, 0);

  /* =====================================================
     ★ ここからが今回の主役：カーソル可視化制御
     ===================================================== */
	let suppressEnsureCursor = false;
	

    function ensureCursorVisible() {
    if (suppressEnsureCursor) return; // ← ★最初に

    if (!window.visualViewport) return;

    const vv = window.visualViewport;
    const cursor = editor.getCursor();
    const coords = editor.cursorCoords(cursor, "window");

    const visibleTop = vv.offsetTop + 16;
    const visibleBottom = vv.offsetTop + vv.height - 24;

    // 下に隠れたときだけ
    if (coords.bottom > visibleBottom) {
      const delta = coords.bottom - visibleBottom;
      editor.scrollTo(null, editor.getScrollInfo().top + delta);
    }
  }

  /* ===== 発火タイミング ===== */

  // ★ タップ直後は自動補正を止める（ジャンプ防止）
  editor.on("mousedown", () => {
    suppressEnsureCursor = true;
    setTimeout(() => {
      suppressEnsureCursor = false;
    }, 200);
  });

  // 入力・改行・カーソル移動すべてに対応
  editor.on("cursorActivity", () => {
    requestAnimationFrame(ensureCursorVisible);
  });

  // フォーカス直後（← これがかなり効く）
  editor.on("focus", () => {
    setTimeout(ensureCursorVisible, 50);
  });

  return editor;
}