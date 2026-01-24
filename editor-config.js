export function initEditor() {
    const editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
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
                const listMatch = lineContent.match(/^(\s*)([*+-](?:\s\[[ xX]\])?|\[[ xX]\])\s+/);
                if (listMatch) {
                    const prefixWithSpace = listMatch[0];
                    if (lineContent === prefixWithSpace) {
                        cm.replaceRange("", {line: cursor.line, ch: 0}, {line: cursor.line, ch: lineContent.length});
                        cm.execCommand("newlineAndIndent");
                        return;
                    }
                    let prefix = listMatch[0];
                    if (prefix.includes('[x]') || prefix.includes('[X]')) {
                        prefix = prefix.replace(/\[[xX]\]/, '[ ]');
                    }
                    cm.replaceSelection("\n" + prefix);
                } else {
                    cm.execCommand("newlineAndIndent");
                }
            }
        }
    });

    // インデント深さをCSS変数に渡すロジック
    editor.on("renderLine", (cm, line, elt) => {
        const text = line.text;
        const match = text.match(/^(\s*)/);
        const spaceCount = match ? match[1].length : 0;
        const indentUnit = cm.getOption("indentUnit") || 1;
        const level = spaceCount / indentUnit;
        elt.style.setProperty('--indent-level', level);
    });

    // --- ここから追加：ブロック選択ボタンのロジック ---
    const selectBtn = document.getElementById('select-block-btn');
    if (selectBtn) {
        selectBtn.onclick = () => {
            const cursor = editor.getCursor();
            const lastLine = editor.lineCount() - 1;

            let startLine = cursor.line;
            let endLine = cursor.line;

            // 上方向に境界（空行または#）を探索
            for (let i = cursor.line; i >= 0; i--) {
                const content = editor.getLine(i).trim();
                if (content === "" || content.startsWith("#")) {
                    startLine = i + 1;
                    break;
                }
                if (i === 0) startLine = 0;
            }

            // 下方向に境界（空行または#）を探索
            for (let i = cursor.line; i <= lastLine; i++) {
                const content = editor.getLine(i).trim();
                if (content === "" || content.startsWith("#")) {
                    endLine = i;
                    break;
                }
                if (i === lastLine) endLine = lastLine;
            }

            // 範囲を選択
            editor.setSelection(
                { line: startLine, ch: 0 },
                { line: endLine, ch: editor.getLine(endLine).length }
            );
            editor.focus();
        };
    }
    // --- ここまで ---

    return editor;
}
