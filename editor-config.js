// editor-config.js
export function initEditor() {
    try {
        const editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
            lineNumbers: true,
            mode: "gfm",
            theme: "dracula",
            lineWrapping: true,
            inputStyle: "contenteditable",
            tabSize: 4,
            indentWithTabs: true, 
            lineWiseCopyCut: true,
            viewportMargin: Infinity,
            // 複雑な独自コマンドを一度すべて外し、標準の挙動に戻します
            extraKeys: {
                "Tab": "indentMore",
                "Shift-Tab": "indentLess"
            }
        });

        /* --- エラーの可能性がある描画ロジックを一時停止 ---
        editor.on("renderLine", (cm, line, elt) => {
            const isList = /^[\t]*[-*+] /.test(line.text);
            if (isList) {
                cm.addLineClass(line, "wrap", "cm-hanging-indent");
            } else {
                cm.removeLineClass(line, "wrap", "cm-hanging-indent");
            }
        });
        ----------------------------------------------- */

        return editor;
    } catch (e) {
        console.error("Editor init error:", e);
    }
}
