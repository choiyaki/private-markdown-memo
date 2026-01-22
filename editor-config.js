// editor-config.js
export function initEditor() {
    try {
        const textArea = document.getElementById("editor");
        if (!textArea) {
            console.error("TextArea not found!");
            return null;
        }

        const editor = CodeMirror.fromTextArea(textArea, {
            lineNumbers: true,      // 行番号を表示
            mode: "gfm",            // GitHub Flavored Markdown
            theme: "dracula",       // テーマ
            lineWrapping: true,     // 折り返し
            inputStyle: "contenteditable",
            tabSize: 4,
            indentWithTabs: true,
            viewportMargin: Infinity
        });

        // エディタが作成された直後にリフレッシュ（表示崩れ防止）
        setTimeout(() => editor.refresh(), 100);

        return editor;
    } catch (e) {
        console.error("CodeMirror initialization failed:", e);
        return null;
    }
}
