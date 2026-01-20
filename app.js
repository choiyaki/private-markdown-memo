import { EditorState } from "https://esm.sh/@codemirror/state";
import { EditorView, keymap, lineNumbers } from "https://esm.sh/@codemirror/view";
import { defaultKeymap, indentWithTab, moveLineUp, moveLineDown } from "https://esm.sh/@codemirror/commands";
import { markdown } from "https://esm.sh/@codemirror/lang-markdown";

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
    lineNumbers(),
    keymap.of([
      indentWithTab,
      ...defaultKeymap
    ])
  ]
});

/* エディタ生成 */
const view = new EditorView({
  state,
  parent: document.getElementById("editor")
});

/* グローバルに触れるように（デバッグ用） */
window.view = view;