const cm = CodeMirror.fromTextArea(
  document.getElementById("editor"),
  {
    mode: "markdown",
    lineWrapping: true,
    lineNumbers: false,
    indentUnit: 2,
    tabSize: 2,
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

cm.setValue(`- ああああああああああああ
- いいいいいいいいいいいい
  - インデントされた行が長くなっても
    自然に揃います
`);