export function initEditor() {
    const editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
        lineNumbers: true,
        mode: "markdown",
        theme: "default",
        lineWrapping: true,
        inputStyle: "contenteditable",
        spellcheck: false,
				indentUnit: 2,
        extraKeys: {
            "Enter": (cm) => {
                // ...（中略：前回のEnterキー補完ロジック）...
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

    // --- ここから追加：インデント深さをCSS変数に渡すロジック ---
    editor.on("renderLine", (cm, line, elt) => {
        const text = line.text;
        // 行頭の空白文字をカウント
        const match = text.match(/^(\s*)/);
        const spaceCount = match ? match[1].length : 0;
        
        // インデントの深さを計算 (スペース2つで1レベルとする場合)
        const indentUnit = cm.getOption("indentUnit") || 2;
        const level = spaceCount / indentUnit;
        
        // HTML要素（行）に直接CSS変数をセット
        elt.style.setProperty('--indent-level', level);
    });
    // --- ここまで ---

    return editor;
}
