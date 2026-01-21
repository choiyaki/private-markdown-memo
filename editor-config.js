// editor-config.js
export function initEditor() {
    const editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
        lineNumbers: true,
        mode: "gfm",
        theme: "dracula",
        lineWrapping: true,
        inputStyle: "contenteditable",
        indentUnit: 2,
        tabSize: 2,
        indentWithTabs: false,
        lineWiseCopyCut: true,
        viewportMargin: Infinity,
        extraKeys: {
            "Enter": (cm) => handleEnterKey(cm),
            "Tab": (cm) => { cm.execCommand("indentMore"); },
            "Shift-Tab": (cm) => { cm.execCommand("indentLess"); }
        }
    });

    // 文頭揃えのロジック
    editor.on("renderLine", (cm, line, elt) => {
        const match = line.text.match(/^(\s*[-*+] )(\[[ xX]\] )?/);
        if (match) {
            const length = match[0].length;
            elt.style.paddingLeft = length + "ch";
            elt.style.textIndent = "-" + length + "ch";
        }
    });

    return editor;
}

function handleEnterKey(cm) {
    const cursor = cm.getCursor();
    const lineText = cm.getLine(cursor.line);
    const match = lineText.match(/^(\s*)([-*+] )(\[[ xX]\] )?/);

    if (match) {
        const [full, indent, bullet, checkbox] = match;
        if (lineText.trim() === (bullet + (checkbox || "")).trim()) {
            cm.replaceRange("", {line: cursor.line, ch: 0}, {line: cursor.line, ch: lineText.length});
            cm.replaceSelection("\n");
        } else {
            const nextMarker = "\n" + indent + bullet + (checkbox ? "[ ] " : "");
            cm.replaceSelection(nextMarker);
        }
    } else {
        cm.replaceSelection("\n");
    }
}
