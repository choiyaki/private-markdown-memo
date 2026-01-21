// toolbar-actions.js
export function setupToolbar(editor) {
    // インデント（右へ）
    document.getElementById("indent-btn").addEventListener("click", () => {
        editor.execCommand("indentMore");
        editor.focus();
    });

    // アウトデント（左へ）
    document.getElementById("outdent-btn").addEventListener("click", () => {
        editor.execCommand("indentLess");
        editor.focus();
    });

    document.getElementById("checkbox-btn").addEventListener("click", () => {
        const cursor = editor.getCursor();
        const lineText = editor.getLine(cursor.line);
        
        if (lineText.includes("[ ]")) {
            editor.replaceRange("[x]", {line: cursor.line, ch: lineText.indexOf("[ ]")}, {line: cursor.line, ch: lineText.indexOf("[ ]") + 3});
        } else if (lineText.includes("[x]")) {
            editor.replaceRange("[ ]", {line: cursor.line, ch: lineText.indexOf("[x]")}, {line: cursor.line, ch: lineText.indexOf("[x]") + 3});
        } else {
            // タブ文字を考慮
            const listMatch = lineText.match(/^([\t]*)([-*+] )/);
            if (listMatch) {
                editor.replaceRange("[ ] ", {line: cursor.line, ch: listMatch[0].length});
            } else {
                // インデント（タブ）を保持したままリスト化
                const indentMatch = lineText.match(/^[\t]*/);
                const indent = indentMatch ? indentMatch[0] : "";
                editor.replaceRange(indent + "- [ ] " + lineText.trimStart(), {line: cursor.line, ch: 0}, {line: cursor.line, ch: lineText.length});
            }
        }
        editor.focus();
    });

    // 上下移動は変更なし（そのまま維持）
    // ... move-up-btn, move-down-btn ...
}
