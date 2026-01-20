import { EditorState } from "https://unpkg.com/@codemirror/state@6.4.1/dist/index.js";
import { EditorView, keymap } from "https://unpkg.com/@codemirror/view@6.24.1/dist/index.js";
import { defaultKeymap, indentWithTab } from "https://unpkg.com/@codemirror/commands@6.3.3/dist/index.js";
import { markdown } from "https://unpkg.com/@codemirror/lang-markdown@6.2.5/dist/index.js";

/* 初期テキスト */
const startDoc = `- ああああああああああああ
- いいいいいいいいいいいい
\t- インデントされた行が長くなっても
\t  自然に揃います
`;

/* エディタ状態 */
const state = EditorState.create({
  doc: startDoc,
  extensions: [
    markdown(),
    EditorView.lineWrapping, // ← ★ これを追加
    keymap.of([
      indentWithTab,
      ...defaultKeymap
    ])
  ]
});

/* エディタ生成 */
new EditorView({
  state,
  parent: document.getElementById("editor")
});