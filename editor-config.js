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
            "Enter": (cm) => handleEnterKey(cm),
            "Tab": "indentMore",
            "Shift-Tab": "indentLess"
        }
    });

    // 描画時にクラスを付与（公式推奨の拡張方法）
    editor.on("renderLine", (cm, line, elt) => {
        const isList = /^[\t]*[-*+] /.test(line.text);
        if (isList) {
            cm.addLineClass(line, "wrap", "cm-hanging-indent");
        } else {
            cm.removeLineClass(line, "wrap", "cm-hanging-indent");
        }
    });

    return editor;
}

// 標準コマンドの代わりに確実に動くリスト継続ロジック
function handleEnterKey(cm) {
    const cursor = cm.getCursor();
    const lineText = cm.getLine(cursor.line);
    const match = lineText.match(/^([\t]*)([-*+] )(\[[ xX]\] )?/);

    if (match) {
        const [full, indent, bullet, checkbox] = match;
        // 記号のみの場合はリスト終了
        if (lineText.trim() === (bullet + (checkbox || "")).trim()) {
            cm.replaceRange("", {line: cursor.line, ch: 0}, {line: cursor.line, ch: lineText.length});
            cm.replaceSelection("\n");
        } else {
            // タブを維持して継続
            const nextMarker = "\n" + indent + bullet + (checkbox ? "[ ] " : "");
            cm.replaceSelection(nextMarker);
        }
    } else {
        cm.replaceSelection("\n");
    }
}
