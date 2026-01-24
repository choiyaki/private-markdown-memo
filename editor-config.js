export function initEditor() {
    const editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
        lineNumbers: false,
        mode: "markdown",
        theme: "default",
        lineWrapping: true,
        inputStyle: "contenteditable",
        spellcheck: false,
        indentUnit: 1,
        tabSize: 1,
        extraKeys: {
            "Enter": (cm) => {
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

    // インデント深さをCSS変数に渡すロジック
    editor.on("renderLine", (cm, line, elt) => {
        const text = line.text;
        const match = text.match(/^(\s*)/);
        const spaceCount = match ? match[1].length : 0;
        const indentUnit = cm.getOption("indentUnit") || 1;
        const level = spaceCount / indentUnit;
        elt.style.setProperty('--indent-level', level);
    });

    // --- ここから追加：ブロック選択ボタンのロジック ---
    const selectBtn = document.getElementById('send-choiyaki');
if (selectBtn) {
    selectBtn.onclick = () => {
        const titleField = document.getElementById('title-field'); // テキストフィールドを取得
        const cursor = editor.getCursor();
        const lastLine = editor.lineCount() - 1;

        let startLine = cursor.line;
        let endLine = cursor.line;

        // 1. 上方向に境界（空行または#）を探索
        for (let i = cursor.line; i >= 0; i--) {
            const content = editor.getLine(i).trim();
            if (content === "" || content.startsWith("#")) {
                startLine = i + 1;
                break;
            }
            if (i === 0) startLine = 0;
        }

        // 2. 下方向に境界（空行または#）を探索
        for (let i = cursor.line; i <= lastLine; i++) {
            const content = editor.getLine(i).trim();
            if (content === "" || content.startsWith("#")) {
                endLine = i - 1;
                break;
            }
            if (i === lastLine) endLine = lastLine;
        }
				
				// 3. ブロックの先頭に「📝」を挿入する
        // 既に挿入されていないかチェックしてから挿入すると、二重挿入を防げます
        const firstLineText = editor.getLine(startLine);
        if (!firstLineText.startsWith("📝")) {
            // startLineの0文字目から、何も消さずに「📝」を挿入
            editor.replaceRange("📝", { line: startLine, ch: 0 });
        }

        // 3. ブロックのテキストを取得（範囲内の行を結合）
        let blockTexts = [];
        for (let i = startLine; i <= endLine; i++) {
            blockTexts.push(editor.getLine(i));
        }
        const blockText = blockTexts.join("\n").replace(/\- /g," ");

        // 4. URLの組み立て
        // テキストフィールドの値をタイトルの一部として使用
        const datePart = titleField.value || ""; 
        const scrapboxPageTitle = encodeURIComponent(`${datePart}日誌`);
        const scrapboxBody = encodeURIComponent(blockText);
        
        const url = `sbporter://scrapbox.io/choiyaki/${scrapboxPageTitle}?body=${scrapboxBody}`;

        // 5. URLを開く
        window.location.href = url;
    };
}

const sendBtn = document.getElementById('send-choidiary');
if (sendBtn) {
    sendBtn.onclick = () => {
        const titleField = document.getElementById('title-field'); // テキストフィールドを取得
        const cursor = editor.getCursor();
        const lastLine = editor.lineCount() - 1;

        let startLine = cursor.line;
        let endLine = cursor.line;

        // 1. 上方向に境界（空行または#）を探索
        for (let i = cursor.line; i >= 0; i--) {
            const content = editor.getLine(i).trim();
            if (content === "" || content.startsWith("#")) {
                startLine = i + 1;
                break;
            }
            if (i === 0) startLine = 0;
        }

        // 2. 下方向に境界（空行または#）を探索
        for (let i = cursor.line; i <= lastLine; i++) {
            const content = editor.getLine(i).trim();
            if (content === "" || content.startsWith("#")) {
                endLine = i - 1;
                break;
            }
            if (i === lastLine) endLine = lastLine;
        }
				
				
        // 3. ブロックのテキストを取得（範囲内の行を結合）
        let blockTexts = [];
        for (let i = startLine; i <= endLine; i++) {
            blockTexts.push(editor.getLine(i));
        }
        const blockText = blockTexts.join("\n").replace(/\- /g," ");
				
				// 3. ブロックの先頭に「📓」を挿入する
        // 既に挿入されていないかチェックしてから挿入すると、二重挿入を防げます
        const firstLineText = editor.getLine(startLine);
        if (!firstLineText.startsWith("📓")) {
            // startLineの0文字目から、何も消さずに「📓」を挿入
            editor.replaceRange("📓", { line: startLine, ch: 0 });
        }


        // 4. URLの組み立て
        // テキストフィールドの値をタイトルの一部として使用
        const datePart = titleField.value || ""; 
        const scrapboxPageTitle = encodeURIComponent(`${datePart}`);
        const scrapboxBody = encodeURIComponent(blockText);
        
        const url = `touch-https://scrapbox.io/choiyaki/${scrapboxPageTitle}?body=${scrapboxBody}`;

        // 5. URLを開く
        window.location.href = url;
    };
}

    const pasteBtn = document.getElementById('paste-btn');
    if (pasteBtn) {
        pasteBtn.onclick = async () => {
            try {
                // クリップボードからテキストを読み取り
                const text = await navigator.clipboard.readText();
                if (text) {
                    // カーソルの現在位置にテキストを挿入
                    editor.replaceSelection(text);
                    // フォーカスをエディタに戻す
                    editor.focus();
                }
            } catch (err) {
                console.error('ペーストに失敗しました:', err);
                alert('クリップボードへのアクセスを許可してください');
            }
        };
    }

// initEditorの中で

editor.on("focus", () => {
    document.body.classList.add("keyboard-open");
});

editor.on("blur", () => {
    document.body.classList.remove("keyboard-open");
});


    return editor;
}
