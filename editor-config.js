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

  // ★ オーバースクロール対策（ここが核心）
  if (keyboardOverlap < 0) keyboardOverlap = 0;

  // ★ 異常値のときは更新しない
  if (keyboardOverlap > window.innerHeight) return;

  editorContainer.style.bottom = `${keyboardOverlap}px`;

  editor.refresh();
}

  window.visualViewport?.addEventListener("resize", resizeEditorForKeyboard);
  window.visualViewport?.addEventListener("scroll", resizeEditorForKeyboard);

  setTimeout(resizeEditorForKeyboard, 0);

  /* =====================================================
     ★ ここからが今回の主役：カーソル可視化制御
     ===================================================== */

  function ensureCursorVisible() {
    if (!window.visualViewport) return;

    const vv = window.visualViewport;
    const cursor = editor.getCursor();

    // カーソルの画面上座標
    const cursorCoords = editor.cursorCoords(cursor, "window");

    // キーボード上端（≒ 表示可能エリア下端）
    const visibleBottom = vv.offsetTop + vv.height;

    // 余白（カーソルがキーボードに近づきすぎないように）
    const margin = 24;

    if (cursorCoords.bottom > visibleBottom - margin) {
      const scrollAmount =
        cursorCoords.bottom - (visibleBottom - margin);

      editor.scrollTo(
        null,
        editor.getScrollInfo().top + scrollAmount
      );
    }
  }

  /* ===== 発火タイミング ===== */

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