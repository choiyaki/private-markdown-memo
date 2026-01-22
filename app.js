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

    window.visualViewport.addEventListener('resize', () => {
        const viewHeight = window.visualViewport.height;
        const fullHeight = window.innerHeight;
        const keyboardHeight = fullHeight - viewHeight;

        if (keyboardHeight > 100) { 
            // キーボード出現時：
            // keyboardHeight に「11行分（約300px）」の余裕をプラスします
            const extraBuffer = 300; 
            container.style.paddingBottom = `${keyboardHeight + extraBuffer}px`;
        } else {
            // キーボードが閉じている時も、少し余白（100px程度）があると
            // 画面の下ギリギリにならず打ちやすいです
            container.style.paddingBottom = '100px';
        }
        
        lockViewport(); 
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
