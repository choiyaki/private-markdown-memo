// editor-config.js
export function initEditor() {
    const editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
        lineNumbers: true,
        mode: "gfm",
        theme: "dracula",
        lineWrapping: true,
        inputStyle: "contenteditable",
        indentUnit: 2,         // インデントの単位
        tabSize: 2,            // タブの表示幅（スペース2つ分）
        indentWithTabs: true,  // ★ここをtrueに：タブ文字を使用する
        lineWiseCopyCut: true,
        viewportMargin: Infinity,
        extraKeys: {
            "Enter": (cm) => handleEnterKey(cm),
            // Tabキー単体でも「タブ文字」を入れるように明示
            "Tab": (cm) => {
                if (cm.somethingSelected()) {
                    cm.indentSelection("add");
                } else {
                    cm.replaceSelection("\t", "end");
                }
            },
            "Shift-Tab": (cm) => { cm.execCommand("indentLess"); }
        }
    });

    // 文頭揃えのロジック（タブ幅対応版）
    editor.on("renderLine", (cm, line, elt) => {
        // タブまたはスペースの後にリスト記号が続く形をマッチング
        const match = line.text.match(/^([\s\t]*[-*+] )(\[[ xX]\] )?/);
        if (match) {
            // ★ CodeMirror.countColumn を使い、タブが含まれていても「見た目上の幅」を正しく計算
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
    // 改行時にタブとスペースの両方をキャプチャするように修正
    const match = lineText.match(/^([\s\t]*)([-*+] )(\[[ xX]\] )?/);

    if (match) {
        const [full, indent, bullet, checkbox] = match;
        if (lineText.trim() === (bullet + (checkbox || "")).trim()) {
            cm.replaceRange("", {line: cursor.line, ch: 0}, {line: cursor.line, ch: lineText.length});
            cm.replaceSelection("\n");
        } else {
            // 前の行のインデント（タブ等）をそのまま引き継ぐ
            const nextMarker = "\n" + indent + bullet + (checkbox ? "[ ] " : "");
            cm.replaceSelection(nextMarker);
        }
    } else {
        cm.replaceSelection("\n");
    }
}
