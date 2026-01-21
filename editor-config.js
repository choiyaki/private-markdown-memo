// editor-config.js
export function initEditor() {
    const editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
        lineNumbers: true,
        mode: "gfm",
        theme: "dracula",
        lineWrapping: true,
        inputStyle: "contenteditable",
        // indentUnit: 2, // 削除して標準に任せる
        tabSize: 4,       // タブの表示幅（標準的な4に設定。お好みで変えられます）
        indentWithTabs: true, 
        lineWiseCopyCut: true,
        viewportMargin: Infinity,
        extraKeys: {
            "Enter": (cm) => handleEnterKey(cm),
            "Tab": "indentMore", // 標準コマンドを使用
            "Shift-Tab": "indentLess"
        }
    });

    // 整列表示（タブ幅を自動計算）
    editor.on("renderLine", (cm, line, elt) => {
        const match = line.text.match(/^([\t]*[-*+] )(\[[ xX]\] )?/);
        if (match) {
            // タブの「見た目上の幅」を正確に取得
            const visualWidth = CodeMirror.countColumn(match[0], null, cm.getOption("tabSize"));
            elt.style.paddingLeft = visualWidth + "ch";
            elt.style.textIndent = "-" + visualWidth + "ch";
        } else {
            elt.style.paddingLeft = "";
            elt.style.textIndent = "";
        }
    });

    return editor;
}

function handleEnterKey(cm) {
    const cursor = cm.getCursor();
    const lineText = cm.getLine(cursor.line);
    const match = lineText.match(/^([\t]*)([-*+] )(\[[ xX]\] )?/);

    if (match) {
        const [full, indent, bullet, checkbox] = match;
        if (lineText.trim() === (bullet + (checkbox || "")).trim()) {
            cm.replaceRange("", {line: cursor.line, ch: 0}, {line: cursor.line, ch: lineText.length});
            cm.replaceSelection("\n");
        } else {
            // インデント（タブ）を維持して改行
            const nextMarker = "\n" + indent + bullet + (checkbox ? "[ ] " : "");
            cm.replaceSelection(nextMarker);
        }
    } else {
        cm.replaceSelection("\n");
    }
}
