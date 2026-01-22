export function initEditor() {
    const editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
        lineNumbers: true,
        mode: "markdown",
        theme: "dracula",
        lineWrapping: true,
        inputStyle: "contenteditable", // iOSでの入力を安定させる
        spellcheck: false,             // 赤い下線を防ぐ
        
        // Enterキーの挙動をカスタマイズ（リスト自動継続）
        extraKeys: {
            "Enter": (cm) => {
                const cursor = cm.getCursor();
                const lineContent = cm.getLine(cursor.line);
                
                // リスト（- ）やチェックボックス（- [ ] ）を判定する正規表現
                const listMatch = lineContent.match(/^(\s*)([*+-](?:\s\[[ xX]\])?|\[[ xX]\])\s+/);

                if (listMatch) {
                    // もし記号だけで中身が空なら、Enterでリストを終了して通常の行に戻す
                    const prefixWithSpace = listMatch[0];
                    if (lineContent === prefixWithSpace) {
                        cm.replaceRange("", {line: cursor.line, ch: 0}, {line: cursor.line, ch: lineContent.length});
                        cm.execCommand("newlineAndIndent");
                        return;
                    }

                    // 次の行に同じ接頭辞をコピー
                    // 完了済み [x] の場合でも、次の行は未完了 [ ] から始める
                    let prefix = listMatch[0];
                    if (prefix.includes('[x]') || prefix.includes('[X]')) {
                        prefix = prefix.replace(/\[[xX]\]/, '[ ]');
                    }
                    
                    cm.replaceSelection("\n" + prefix);
                } else {
                    // リストでない場合は通常の改行
                    cm.execCommand("newlineAndIndent");
                }
            }
        }
    });

    return editor;
}
