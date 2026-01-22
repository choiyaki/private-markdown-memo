// app.js
import { memoDocRef, setDoc, onSnapshot } from './firebase.js';
import { initEditor } from './editor-config.js';
import { setupToolbar } from './toolbar-actions.js';

document.addEventListener("DOMContentLoaded", () => {
    const editor = initEditor();
    if (!editor) return;

    setupToolbar(editor);

    let lastSyncedContent = "";
    let isInternalChange = false;
    let saveTimeout = null;

    // Firebase受信 (Editorへの反映)
    onSnapshot(memoDocRef, (doc) => {
        if (!doc.exists()) return;
        const remote = doc.data().content || "";
        
        if (remote === editor.getValue()) {
            lastSyncedContent = remote;
            return;
        }

        // 入力中の衝突を避けるため、フォーカスがない時だけ反映
        if (!editor.hasFocus()) {
            isInternalChange = true;
            editor.setValue(remote);
            lastSyncedContent = remote;
            isInternalChange = false;
        }
    });

    // Firebase送信 (保存処理)
    const saveToFirebase = () => {
        const current = editor.getValue();
        if (current === lastSyncedContent) return;
        
        setDoc(memoDocRef, { content: current }, { merge: true })
            .then(() => { lastSyncedContent = current; })
            .catch(console.error);
    };

    // 変更検知
    editor.on("change", (cm, changeObj) => {
        if (isInternalChange || changeObj.origin === "setValue") return;
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(saveToFirebase, 800);
    });
});
