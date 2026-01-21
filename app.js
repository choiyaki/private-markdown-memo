import { memoDocRef, setDoc, onSnapshot } from './firebase.js';

let editor;

try {
    editor = CodeMirror.fromTextArea(document.getElementById("editor"), {
        lineNumbers: true,
        mode: "gfm", // GitHub Flavored Markdown
        theme: "dracula",
        lineWrapping: true,
        inputStyle: "contenteditable",
        // --- ここから追加 ---
        extraKeys: {
            // Enterキーを押したときに「改行＋インデント継続」を命令する
            "Enter": (cm) => {
                // 基本の改行＋インデント機能を呼び出す
                cm.execCommand("newlineAndIndent");
                
                // 前の行のリスト記号を判定して補完する処理
                const cursor = cm.getCursor();
                const prevLine = cm.getLine(cursor.line - 1);
                const match = prevLine.match(/^(\s*)([-*+] )(\[[ xX]\] )?/);
                
                if (match) {
                    const [full, indent, bullet, checkbox] = match;
                    // 空のリスト（"- " だけの行）なら、その行を消してリスト終了
                    if (prevLine.trim() === (bullet + (checkbox || "")).trim()) {
                        cm.replaceRange("", {line: cursor.line - 1, ch: 0}, {line: cursor.line - 1, ch: prevLine.length});
                    } else {
                        // 内容があるなら、記号を引き継ぐ
                        const nextMarker = bullet + (checkbox ? "[ ] " : "");
                        cm.replaceSelection(nextMarker);
                    }
                }
            }
        }
        // --- ここまで追加 ---
    });

    console.log("CodeMirror initialized with list support");
} catch (error) {
    console.error("Initialization error:", error);
}

// ...（以下の同期ロジックはそのまま維持）
