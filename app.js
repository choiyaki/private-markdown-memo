import { EditorState } from "https://unpkg.com/@codemirror/state@6.4.1/dist/index.js";
import { EditorView } from "https://unpkg.com/@codemirror/view@6.24.1/dist/index.js";

/* 初期テキスト */
const state = EditorState.create({
  doc: "テスト\n改行できます\n横に伸びません",
  extensions: [
    EditorView.lineWrapping
  ]
});

/* エディタ生成 */
new EditorView({
  state,
  parent: document.getElementById("editor")
});