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
        const { line } = editor.getCursor();
        if (line > 0) {
            const cur = editor.getLine(line);
            const pre = editor.getLine(line - 1);
            editor.replaceRange(cur, {line: line - 1, ch: 0}, {line: line - 1, ch: pre.length});
            editor.replaceRange(pre, {line: line, ch: 0}, {line: line, ch: cur.length});
            editor.setCursor(line - 1, editor.getCursor().ch);
        }
        editor.focus();
    });

    document.getElementById("move-down-btn").addEventListener("click", () => {
        const { line } = editor.getCursor();
        if (line < editor.lineCount() - 1) {
            const cur = editor.getLine(line);
            const nxt = editor.getLine(line + 1);
            editor.replaceRange(cur, {line: line + 1, ch: 0}, {line: line + 1, ch: nxt.length});
            editor.replaceRange(nxt, {line: line, ch: 0}, {line: line, ch: cur.length});
            editor.setCursor(line + 1, editor.getCursor().ch);
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
            const listMatch = lineText.match(/^([\t]*)([-*+] )/);
            if (listMatch) {
                editor.replaceRange("[ ] ", {line: cursor.line, ch: listMatch[0].length});
            } else {
                const indent = lineText.match(/^[\t]*/)[0];
                editor.replaceRange(indent + "- [ ] " + lineText.trimStart(), {line: cursor.line, ch: 0}, {line: cursor.line, ch: lineText.length});
            }
        }
        editor.focus();
    });
}
