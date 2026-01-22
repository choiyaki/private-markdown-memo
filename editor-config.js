export function initEditor() {
    const editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
        lineNumbers: true,
        mode: "markdown",
        theme: "dracula",
        lineWrapping: true,
        inputStyle: "contenteditable", // iPhoneでの文字入力を安定させる設定
        spellcheck: true,
        // ここに Enter キーの特別な動きを追加しています
        extraKeys: {
            "Enter": (cm) => {
                const cursor = cm.getCursor();
                const lineContent = cm.getLine(cursor.line);
                
                // 行が「- 」や「* 」、チェックボックスで始まっているかチェック
                const listMatch = lineContent.match(/^(\s*)([*+-]|\[[ xX]\])\s+/);

                if (listMatch) {
                    // もし記号だけで中身が空なら、リストを終了して改行
                    if (lineContent.trim() === listMatch[2]) {
                        cm.replaceRange("", {line: cursor.line, ch: 0}, {line: cursor.line, ch: lineContent.length});
                        cm.execCommand("newlineAndIndent");
                    } else {
                        // 次の行に同じ記号（とインデント）をコピー
                        const prefix = listMatch[0];
                        cm.replaceSelection("\n" + prefix);
                    }
                } else {
                    // リストでない場合は普通の改行
                    cm.execCommand("newlineAndIndent");
                }
            }
        }
    });
    return editor;
}
