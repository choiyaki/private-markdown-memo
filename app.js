// app.js
import { memoDocRef, setDoc, onSnapshot } from './firebase.js';
import { initEditor } from './editor-config.js';
import { setupToolbar } from './toolbar-actions.js';

const editor = initEditor();
setupToolbar(editor);

let lastSyncedContent = "";
let isInternalChange = false;
let saveTimeout = null;

// Firebase受信
onSnapshot(memoDocRef, (doc) => {
    if (!doc.exists()) return;
    const remote = doc.data().content || "";
    if (remote === editor.getValue()) {
        lastSyncedContent = remote;
        return;
    }
    // フォーカスがない時だけ上書き（衝突防止）
    if (!editor.hasFocus()) {
        isInternalChange = true;
        const cursor = editor.getCursor();
        editor.setValue(remote);
        editor.setCursor(cursor);
        lastSyncedContent = remote;
        isInternalChange = false;
    }
});

// Firebase送信
const saveToFirebase = () => {
    const current = editor.getValue();
    if (current === lastSyncedContent) return;
    setDoc(memoDocRef, { content: current }, { merge: true })
        .then(() => { lastSyncedContent = current; })
        .catch(console.error);
};

// 変更監視
editor.on("change", (cm, changeObj) => {
    if (isInternalChange || changeObj.origin === "setValue") return;
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveToFirebase, 800);
});


// app.js の末尾などに追加

if (window.visualViewport) {
    const toolbar = document.getElementById('toolbar');
    const container = document.getElementById('editor-container');

    window.visualViewport.addEventListener('resize', () => {
        // キーボードを含まない「実際に見えている高さ」を取得
        const viewHeight = window.visualViewport.height;
        
        // ツールバーの高さを差し引いた分をエディタの高さにする
        const newHeight = viewHeight - toolbar.offsetHeight;
        
        // エディタコンテナの高さを強制的に書き換え
        container.style.height = `${newHeight}px`;
        
        // 画面が勝手にスクロールするのを防ぐため、最上部へ強制移動
        window.scrollTo(0, 0);
        
        // CodeMirrorにサイズ変更を通知
        if (editor) editor.refresh();
    });
}
