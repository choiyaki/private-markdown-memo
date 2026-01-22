// app.js
import { memoDocRef, setDoc, onSnapshot } from './firebase.js';
import { initEditor } from './editor-config.js';
import { setupToolbar } from './toolbar-actions.js';

const editor = initEditor();
setupToolbar(editor);

// app.js

// エディタの初期化後に以下を追加
editor.on("focus", () => {
    // ページ全体の意図しないスクロールを強制的に0に戻し続ける
    const fixScroll = () => {
        window.scrollTo(0, 0);
    };
    
    // キーボードアニメーションに合わせて数回実行
    setTimeout(fixScroll, 10);
    setTimeout(fixScroll, 100);
    setTimeout(fixScroll, 300);
});

// 入力時にも全体がズレないように監視
window.addEventListener('scroll', (e) => {
    if (window.scrollY !== 0) {
        window.scrollTo(0, 0);
    }
}, { passive: false });


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
