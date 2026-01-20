const editor = CodeMirror.fromTextArea(
  document.getElementById("editor"),
  {
    mode: "markdown",
    lineWrapping: true,
    lineNumbers: false,
    tabSize: 2,
    indentUnit: 2,
    extraKeys: {
      Tab(cm) {
        cm.execCommand("insertSoftTab");
      },
      "Shift-Tab"(cm) {
        cm.execCommand("indentLess");
      }
    }
  }
);

/* 初期テキスト */
editor.setValue(`- ああああああああああああ
- いいいいいいいいいいいい
  - インデントされた行が長くなっても自然に揃います
`);