// toolbar-actions.js
export function setupToolbar(editor) {
    if (!editor) return; // エディタが壊れている場合の保護

    document.getElementById("indent-btn").addEventListener("click", () => {
        editor.execCommand("indentMore");
        editor.focus();
    });

    document.getElementById("outdent-btn").addEventListener("click", () => {
        editor.execCommand("indentLess");
        editor.focus();
    });

    // 上下移動
    document.getElementById("move-up-btn").addEventListener("click", () => {
        const { line } = editor.getCursor();
        if (line > 0) {
            const cur = editor.getLine(line);
            const pre = editor.getLine(line - 1);
            editor.replaceRange(cur, {line: line - 1, ch: 0}, {line: line - 1, ch: pre.length});
            editor.replaceRange(pre, {line: line, ch: 0}, {line: line, ch: cur.length});
            editor.setCursor(line - 1);
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
            editor.setCursor(line + 1);
        }
        editor.focus();
    });

    document.getElementById("checkbox-btn").addEventListener("click", () => {
        const cursor = editor.getCursor();
        const lineText = editor.getLine(cursor.line);
        // [ ] の切り替えのみ実行
        if (lineText.includes("[ ]")) {
            editor.replaceRange("[x]", {line: cursor.line, ch: lineText.indexOf("[ ]")}, {line: cursor.line, ch: lineText.indexOf("[ ]") + 3});
        } else if (lineText.includes("[x]")) {
            editor.replaceRange("[ ]", {line: cursor.line, ch: lineText.indexOf("[x]")}, {line: cursor.line, ch: lineText.indexOf("[x]") + 3});
        }
        editor.focus();
    });
}
