// toolbar-actions.js

export function setupToolbar(editor) {
    // インデント（右へ移動：タブを1つ追加）
    document.getElementById("indent-btn").addEventListener("click", () => {
        // 選択範囲がある場合も考慮したCodeMirrorの標準コマンド
        // indentWithTabs: true の設定により、タブが挿入されます
        editor.execCommand("indentMore");
        editor.focus();
    });

    // アウトデント（左へ移動：タブを1つ削除）
    document.getElementById("outdent-btn").addEventListener("click", () => {
        // indentWithTabs: true の設定により、タブを優先的に削除します
        editor.execCommand("indentLess");
        editor.focus();
    });

    // --- 以下、上下移動やチェックボックスの処理はそのまま ---
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
            // タブ文字も考慮した正規表現でマッチング
            const listMatch = lineText.match(/^([\s\t]*)([-*+] )/);
            if (listMatch) {
                editor.replaceRange("[ ] ", {line: cursor.line, ch: listMatch[0].length});
            } else {
                editor.replaceRange("- [ ] " + lineText, {line: cursor.line, ch: 0}, {line: cursor.line, ch: lineText.length});
            }
        }
        editor.focus();
    });
}
