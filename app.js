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

    window.visualViewport.addEventListener('resize', () => {
        // 全体の高さ - 現在見えている高さ = キーボードの高さ
        const keyboardHeight = window.innerHeight - window.visualViewport.height;
        
        if (keyboardHeight > 0) {
            // キーボードが出ているとき：キーボードのすぐ上に配置
            // iOSのバウンス（跳ね返り）を考慮してbottomを調整
            toolbar.style.bottom = `${keyboardHeight}px`;
        } else {
            // キーボードが閉じているとき：画面の一番下
            toolbar.style.bottom = '0';
        }
        
        // ズレを防止するために再描画を促す
        window.scrollTo(0, 0);
    });

    // スクロール時にも位置を維持するための補正（iOS対策）
    window.visualViewport.addEventListener('scroll', () => {
        const keyboardHeight = window.innerHeight - window.visualViewport.height;
        if (keyboardHeight > 0) {
            // スクロール位置に合わせてオフセットを微調整
            const offset = window.innerHeight - window.visualViewport.offsetTop - window.visualViewport.height;
            toolbar.style.bottom = `${offset}px`;
        }
    });
}
