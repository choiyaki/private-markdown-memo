// editor-config.js
export function initEditor() {
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
        extraKeys: {
            "Enter": "newlineAndIndentContinueMarkdownList", // 公式のリスト継続コマンド
            "Tab": "indentMore",
            "Shift-Tab": "indentLess"
        }
    });

    // 自前でスタイルを計算せず、CodeMirrorの行管理機能（LineClass）を利用する
    editor.on("renderLine", (cm, line, elt) => {
        const match = line.text.match(/^([\t]*[-*+] )(\[[ xX]\] )?/);
        if (match) {
            // CodeMirrorに「この行はぶら下げインデントが必要」とマークする
            cm.addLineClass(line, "wrap", "cm-hanging-indent");
        } else {
            // 不要な場合はクラスを削除
            cm.removeLineClass(line, "wrap", "cm-hanging-indent");
        }
    });

    return editor;
}
