// toolbar-actions.js
export function setupToolbar(editor) {
    if (!editor) return;

    // インデント調整
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

    // ✅ チェックボックス・トグル機能（リスト → 未完了 → 完了 → 解除）
    document.getElementById("checkbox-btn").addEventListener("click", () => {
        const cursor = editor.getCursor();
        const line = cursor.line;
        const lineContent = editor.getLine(line);

        // 状態を判定するためのパターン
        const patterns = {
            todo: /^(\s*)[-*+]\s+\[ \]\s+/,         // "- [ ] "
            done: /^(\s*)[-*+]\s+\[[xX]\]\s+/,      // "- [x] "
            list: /^(\s*)[-*+]\s+/                  // "- " (単なるリスト)
        };

        let newLineContent = "";

        if (patterns.todo.test(lineContent)) {
            // 未完了 [ ] -> 完了 [x]
            newLineContent = lineContent.replace(patterns.todo, '$1- [x] ');
        } else if (patterns.done.test(lineContent)) {
            // 完了 [x] -> 記号削除 (テキストのみ)
            newLineContent = lineContent.replace(patterns.done, '$1');
        } else if (patterns.list.test(lineContent)) {
            // リスト - -> 未完了 [ ]
            newLineContent = lineContent.replace(patterns.list, '$1- [ ] ');
        } else {
            // 何もなし -> リスト -
            const indentMatch = lineContent.match(/^(\s*)/);
            const indent = indentMatch ? indentMatch[1] : "";
            newLineContent = indent + "- " + lineContent.trimStart();
        }

        // 行全体を入れ替え
        editor.replaceRange(
            newLineContent,
            { line: line, ch: 0 },
            { line: line, ch: lineContent.length }
        );
        
        editor.focus();
    });
}
