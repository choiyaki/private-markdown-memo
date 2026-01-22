export function initEditor() {
    const editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
        lineNumbers: true,
        mode: "text/plain",
        theme: "dracula",
        lineWrapping: true,
        inputStyle: "contenteditable",
        spellcheck: true,
        extraKeys: {
            "Enter": (cm) => {
                const cursor = cm.getCursor();
                const lineContent = cm.getLine(cursor.line);
                
                // 1. リスト（- ）やチェックボックス（- [ ] ）の両方に対応する正規表現
                //    行頭のスペース、記号（-*+）、およびオプションのチェックボックス [ ] を取得
                const listMatch = lineContent.match(/^(\s*)([*+-](?:\s\[[ xX]\])?|\[[ xX]\])\s+/);

                if (listMatch) {
                    // 2. 記号だけで中身が空の状態で Enter を押したら、その行の記号を消してリスト終了
                    //    （例： "- [ ] " だけの行で Enter を押すと普通の行に戻る）
                    const prefixWithSpace = listMatch[0];
                    if (lineContent === prefixWithSpace) {
                        cm.replaceRange("", {line: cursor.line, ch: 0}, {line: cursor.line, ch: lineContent.length});
                        cm.execCommand("newlineAndIndent");
                        return;
                    }

                    // 3. 次の行に同じ接頭辞をコピー
                    //    チェックボックスが [x] と入力済みでも、次の行は空の [ ] にしたい場合はここを調整
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
    return editor;
}
