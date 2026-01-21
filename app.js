import { memoDocRef, setDoc, onSnapshot } from './firebase.js';

let editor;
let lastSyncedContent = "";
let isInternalChange = false;
let saveTimeout = null;

try {
    editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
        lineNumbers: true,
        mode: "gfm",
        theme: "dracula",
        lineWrapping: true,
        inputStyle: "contenteditable",
        indentUnit: 2,         
        smartIndent: true,     
        tabSize: 2,            
        indentWithTabs: false, // スペース2つに統一（これが最も安定します）
        lineWiseCopyCut: true,
        viewportMargin: Infinity, 
        extraKeys: {
            "Enter": (cm) => {
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
                    return;
                }
                return CodeMirror.Pass;
            },
            "Tab": (cm) => {
                // Tabキーでスペース2つ分インデント
                cm.execCommand("indentMore");
            },
            "Shift-Tab": (cm) => {
                cm.execCommand("indentLess");
            }
        }
    });

    // ★ 文頭揃えのロジックを再構築
    editor.on("renderLine", (cm, line, elt) => {
        // 行頭の空白、リスト記号、チェックボックスをすべて含めてマッチング
        const match = line.text.match(/^(\s*[-*+] )(\[[ xX]\] )?/);
        if (match) {
            // match[0] の実際の文字数を取得
            const length = match[0].length;
            // 2行目以降の開始位置を padding で作り、1行目だけ text-indent で左に戻す
            elt.style.paddingLeft = length + "ch";
            elt.style.textIndent = "-" + length + "ch";
        } else {
            // リスト以外の行（または空行）はリセット
            elt.style.paddingLeft = "";
            elt.style.textIndent = "";
        }
    });

    editor.refresh();
} catch (error) {
    console.error("Initialization error:", error);
}

// --- ツールバーボタンの修正（確実に動くコマンドに変更） ---

document.getElementById("indent-btn").addEventListener("click", () => {
    editor.execCommand("indentMore"); // 確実に右へ
    editor.focus();
});

document.getElementById("outdent-btn").addEventListener("click", () => {
    editor.execCommand("indentLess"); // 確実に左へ
    editor.focus();
});

// --- チェックボックスボタンの修正 ---
document.getElementById("checkbox-btn").addEventListener("click", () => {
    const cursor = editor.getCursor();
    const lineText = editor.getLine(cursor.line);
    
    // 状態のトグル
    if (lineText.includes("[ ]")) {
        editor.replaceRange("[x]", {line: cursor.line, ch: lineText.indexOf("[ ]")}, {line: cursor.line, ch: lineText.indexOf("[ ]") + 3});
    } else if (lineText.includes("[x]")) {
        editor.replaceRange("[ ]", {line: cursor.line, ch: lineText.indexOf("[x]")}, {line: cursor.line, ch: lineText.indexOf("[x]") + 3});
    } else {
        const listMatch = lineText.match(/^(\s*)([-*+] )/);
        if (listMatch) {
            // すでにリスト記号がある場合はその直後に挿入
            editor.replaceRange("[ ] ", {line: cursor.line, ch: listMatch[0].length});
        } else {
            // 何もない場合は新規作成
            editor.replaceRange("- [ ] " + lineText, {line: cursor.line, ch: 0}, {line: cursor.line, ch: lineText.length});
        }
    }
    editor.focus();
});

// --- 上下移動・同期ロジック（そのまま） ---
// ...（以前のコードの move-up, move-down, onSnapshot, saveToFirebase を維持）
