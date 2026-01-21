// toolbar-actions.js
export function setupToolbar(editor) {
    document.getElementById("indent-btn").addEventListener("click", () => {
        editor.execCommand("indentMore");
        editor.focus();
    });

    document.getElementById("outdent-btn").addEventListener("click", () => {
        editor.execCommand("indentLess");
        editor.focus();
    });

    document.getElementById("move-up-btn").addEventListener("click", () => {
        const cursor = editor.getCursor();
        const line = cursor.line;
        if (line > 0) {
            const currentText = editor.getLine(line);
            const prevText = editor.getLine(line - 1);
            editor.replaceRange(currentText, {line: line - 1, ch: 0}, {line: line - 1, ch: prevText.length});
            editor.replaceRange(prevText, {line: line, ch: 0}, {line: line, ch: currentText.length});
            editor.setCursor({line: line - 1, ch: cursor.ch});
        }
        editor.focus();
    });

    document.getElementById("move-down-btn").addEventListener("click", () => {
        const cursor = editor.getCursor();
        const line = cursor.line;
        if (line < editor.lineCount() - 1) {
            const currentText = editor.getLine(line);
            const nextText = editor.getLine(line + 1);
            editor.replaceRange(currentText, {line: line + 1, ch: 0}, {line: line + 1, ch: nextText.length});
            editor.replaceRange(nextText, {line: line, ch: 0}, {line: line, ch: currentText.length});
            editor.setCursor({line: line + 1, ch: cursor.ch});
        }
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
            const listMatch = lineText.match(/^(\s*)([-*+] )/);
            if (listMatch) {
                editor.replaceRange("[ ] ", {line: cursor.line, ch: listMatch[0].length});
            } else {
                editor.replaceRange("- [ ] " + lineText, {line: cursor.line, ch: 0}, {line: cursor.line, ch: lineText.length});
            }
        }
        editor.focus();
    });
}
