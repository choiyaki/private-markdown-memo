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

window.visualViewport.addEventListener('resize', () => {
    const viewHeight = window.visualViewport.height;
    const fullHeight = window.innerHeight;
    const toolbarHeight = toolbar.offsetHeight;
    const keyboardHeight = fullHeight - viewHeight;

    if (keyboardHeight > 100) { 
        // 【キーボード表示時】
        // 見えている範囲ちょうどに高さを縮める
        container.style.height = `${viewHeight - toolbarHeight}px`;
        container.style.paddingBottom = '20px'; // キーボード直上の最小余白
    } else {
        // 【キーボード非表示時】
        // 画面いっぱいの高さに戻す
        container.style.height = `${fullHeight - toolbarHeight}px`;
        
        // --- ここで下部の余白（空き地）を広げる ---
        container.style.paddingBottom = '200px'; // ここを好きな数値に変更
    }

    container.style.flexGrow = '0';
    window.scrollTo(0, 0);
    
    if (editor) {
        editor.refresh();
        // キーボード表示時のみカーソルを追う
        if (keyboardHeight > 100) {
            editor.scrollIntoView(editor.getCursor());
        }
    }
});




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
