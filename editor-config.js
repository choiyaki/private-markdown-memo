// editor-config.js
export function initEditor() {
  const editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
    lineNumbers: true,
    mode: "gfm",
    theme: "dracula",
    lineWrapping: true,
    inputStyle: "contenteditable",
    tabSize: 4,            // タブ幅を4に固定
    indentWithTabs: true,  // タブを使用
    lineWiseCopyCut: true,
    viewportMargin: Infinity,
    extraKeys: {
      "Enter": "newlineAndIndentContinueMarkdownList", // 公式のリスト継続機能
      "Tab": "indentMore",
      "Shift-Tab": "indentLess"
    }
  });

  // CodeMirrorのAPIを使用して行にクラスを付与する（準拠したやり方）
  editor.on("renderLine", (cm, line, elt) => {
    // リスト記号（- or * or +）から始まる行を判定
    const isList = /^[\t]*[-*+] /.test(line.text);
    if (isList) {
      // CodeMirrorに行クラスを追加（DOMを直接触らずAPI経由）
      cm.addLineClass(line, "wrap", "cm-hanging-indent");
    } else {
      cm.removeLineClass(line, "wrap", "cm-hanging-indent");
    }
  });

  return editor;
}
