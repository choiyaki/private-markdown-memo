// app.js
import { memoDocRef, setDoc, onSnapshot } from './firebase.js';
import { initEditor } from './editor-config.js';
import { setupToolbar } from './toolbar-actions.js';

const editor = initEditor();
setupToolbar(editor);

// --- iPhoneキーボード出現時のスクロール底上げ対策 ---

if (window.visualViewport) {
    const container = document.getElementById('editor-container');

    window.visualViewport.addEventListener('resize', () => {
        // キーボードを含まない「実際に見えている高さ」
        const viewHeight = window.visualViewport.height;
        // ブラウザ全体の高さ
        const fullHeight = window.innerHeight;
        // その差が「キーボードの高さ」
        const keyboardHeight = fullHeight - viewHeight;

        if (keyboardHeight > 100) { 
            // キーボードが出た：コンテナの底にキーボード分のクッションを作る
            container.style.paddingBottom = `${keyboardHeight}px`;
        } else {
            // キーボードが閉じた：余白を戻す
            container.style.paddingBottom = '20px';
        }
        
        // 画面全体が上にズレるのを強制的にリセット
        window.scrollTo(0, 0);
    });
}

// フォーカス時も全体がズレないよう保険をかける
editor.on("focus", () => {
    setTimeout(() => window.scrollTo(0, 0), 100);
});



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
