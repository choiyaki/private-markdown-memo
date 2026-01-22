import { memoDocRef, setDoc, onSnapshot } from './firebase.js';
import { initEditor } from './editor-config.js';
import { setupToolbar } from './toolbar-actions.js';

// 1. 初期化
const editor = initEditor();
setupToolbar(editor);

// 2. 画面外への逃げ防止（スクロールロック）
const lockViewport = () => {
    if (window.scrollY !== 0) {
        window.scrollTo(0, 0);
    }
};

// 全体のスクロールを常に監視して 0 に戻す
window.addEventListener('scroll', lockViewport, { passive: false });

// app.js の該当箇所を修正

if (window.visualViewport) {
    const container = document.getElementById('editor-container');
    const toolbar = document.getElementById('toolbar');

    window.visualViewport.addEventListener('resize', () => {
        // 「実際に見えている範囲」の高さ
        const viewHeight = window.visualViewport.height;
        
        // ツールバーの高さを取得（padding等も含めた高さ）
        const toolbarHeight = toolbar.offsetHeight;

        // エディタの新しい高さを計算（見えている範囲 - ツールバー）
        const newHeight = viewHeight - toolbarHeight;

        // 重要：paddingではなく、height（高さ）そのものを固定する
        container.style.height = `${newHeight}px`;
        container.style.flexGrow = '0'; // Flexboxによる自動伸縮を止める

        // 画面のズレを強制リセット
        window.scrollTo(0, 0);
        
        // エディタ（CodeMirror）にサイズ変更を通知
        if (editor) {
            editor.refresh();
            // カーソル位置が隠れないようにスクロールさせる
            editor.scrollIntoView(editor.getCursor());
        }
    });
}



// フォーカス時にも強制リセット
editor.on("focus", () => {
    setTimeout(lockViewport, 100);
});

// 4. Firebase関連（以前のまま）
let lastSyncedContent = "";
let isInternalChange = false;
let saveTimeout = null;

onSnapshot(memoDocRef, (doc) => {
    if (!doc.exists()) return;
    const remote = doc.data().content || "";
    if (remote === editor.getValue()) {
        lastSyncedContent = remote;
        return;
    }
    if (!editor.hasFocus()) {
        isInternalChange = true;
        editor.setValue(remote);
        lastSyncedContent = remote;
        isInternalChange = false;
    }
});

const saveToFirebase = () => {
    const current = editor.getValue();
    if (current === lastSyncedContent) return;
    setDoc(memoDocRef, { content: current }, { merge: true })
        .then(() => { lastSyncedContent = current; })
        .catch(console.error);
};

editor.on("change", (cm, changeObj) => {
    if (isInternalChange || changeObj.origin === "setValue") return;
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveToFirebase, 800);
});
