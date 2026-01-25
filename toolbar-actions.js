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
		

    // --- ブロック選択・送信 (📝) ---
    const selectBtn = document.getElementById('select-block-btn');
    if (selectBtn) {
        selectBtn.addEventListener("click", () => {
            const titleField = document.getElementById('title-field');
            const cursor = editor.getCursor();
            const lastLine = editor.lineCount() - 1;

            let startLine = cursor.line;
            let endLine = cursor.line;

            // 1. 上方向に境界を探索
            for (let i = cursor.line; i >= 0; i--) {
                const content = editor.getLine(i).trim();
                if (content === "" || content.startsWith("#")) {
                    startLine = i + 1;
                    break;
                }
                if (i === 0) startLine = 0;
            }

            // 2. 下方向に境界を探索
            for (let i = cursor.line; i <= lastLine; i++) {
                const content = editor.getLine(i).trim();
                if (content === "" || content.startsWith("#")) {
                    endLine = i - 1;
                    break;
                }
                if (i === lastLine) endLine = lastLine;
            }

            // 4. テキスト取得と成形
            let blockTexts = [];
            for (let i = startLine; i <= endLine; i++) {
                blockTexts.push(editor.getLine(i));
            }
            // リストの「- 」を削除して整形
            const blockText = blockTexts.join("\n").replace(/\- /g, " ");
						
						// 3. ブロックの先頭に「📝」を挿入
            const firstLineText = editor.getLine(startLine);
            if (!firstLineText.startsWith("📝")) {
                editor.replaceRange("📝", { line: startLine, ch: 0 });
            }

            // 5. URL組み立てと遷移
            const datePart = titleField ? titleField.value : "";
            const scrapboxPageTitle = encodeURIComponent(`${datePart}日誌`);
            const scrapboxBody = encodeURIComponent(blockText);
            
            const url = `sbporter://scrapbox.io/choiyaki/${scrapboxPageTitle}?body=${scrapboxBody}`;
            window.location.href = url;
            
            editor.focus();
        });
    }
		
		
		// --- ブロック選択・送信 (📓) ---
    const diaryBtn = document.getElementById('diary-block-btn');
    if (diaryBtn) {
        diaryBtn.addEventListener("click", () => {
            const titleField = document.getElementById('title-field');
            const cursor = editor.getCursor();
            const lastLine = editor.lineCount() - 1;

            let startLine = cursor.line;
            let endLine = cursor.line;

            // 1. 上方向に境界を探索
            for (let i = cursor.line; i >= 0; i--) {
                const content = editor.getLine(i).trim();
                if (content === "" || content.startsWith("#")) {
                    startLine = i + 1;
                    break;
                }
                if (i === 0) startLine = 0;
            }

            // 2. 下方向に境界を探索
            for (let i = cursor.line; i <= lastLine; i++) {
                const content = editor.getLine(i).trim();
                if (content === "" || content.startsWith("#")) {
                    endLine = i - 1;
                    break;
                }
                if (i === lastLine) endLine = lastLine;
            }

            // 4. テキスト取得と成形
            let blockTexts = [];
            for (let i = startLine; i <= endLine; i++) {
                blockTexts.push(editor.getLine(i));
            }
            // リストの「- 」を削除して整形
            const blockText = blockTexts.join("\n").replace(/\- /g, " ");
						
						// 3. ブロックの先頭に「📓」を挿入
            const firstLineText = editor.getLine(startLine);
            if (!firstLineText.startsWith("📓")) {
                editor.replaceRange("📓", { line: startLine, ch: 0 });
            }

            // 5. URL組み立てと遷移
            const datePart = titleField ? titleField.value : "";
            const scrapboxPageTitle = encodeURIComponent(`${datePart}`);
            const scrapboxBody = encodeURIComponent(blockText);
            
            const url = `touch-https://scrapbox.io/choidiary/${scrapboxPageTitle}?body=${scrapboxBody}`;
            window.location.href = url;
            
            editor.focus();
        });
    }

    // --- ペースト (📋) ---
    const pasteBtn = document.getElementById('paste-btn');
    if (pasteBtn) {
        pasteBtn.addEventListener("click", async () => {
            try {
                const text = await navigator.clipboard.readText();
                if (text) {
                    editor.replaceSelection(text);
                    editor.focus();
                }
            } catch (err) {
                console.error('ペースト失敗:', err);
            }
        });
    }
		

const exportBtn = document.getElementById('export-all-btn');
if (exportBtn) {
    exportBtn.addEventListener('click', () => {
        const titleValue = document.getElementById('title-field').value || "無題";
        const fullText = editor.getValue();
        
        // 1. 全文を「空行」で分割してブロックごとの配列にする
        // ※見出し（#）でも区切りたい場合は、正規表現で調整します
        const blocks = fullText.split(/\n\s*\n/);

        // 2. 📝 または 📓 を含むブロックを除外する
        const filteredBlocks = blocks.filter(block => {
            const trimmedBlock = block.trim();
            // ブロックの先頭、あるいは行の途中に記号があるかチェック
            // (startsWithだけでなく、includesを使う方が確実です)
            return !trimmedBlock.includes("📝") && !trimmedBlock.includes("📓");
        });

        // 3. 残ったブロックを空行で繋ぎ直す
        const cleanedBody = filteredBlocks.join("\n\n").trim();

        if (!cleanedBody) {
            alert("エクスポート可能な未送信ブロックがありません。");
            return;
        }
				
				const Body = encodeURIComponent(titleValue + "\n" + cleanedBody);
        const url = `shortcuts://run-shortcut?name=Choiyakiをmd保存&input=${Body}`;


        // 5. 実行
        window.location.href = url;
    });
}

		
}
