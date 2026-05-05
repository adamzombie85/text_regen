/**
 * 41 研究室 - 文本分析助手 (main.js)
 * 恢復原始專業版：撤銷精簡化，恢復絕對排名分區邏輯
 */

let mdMap = {}, twMap = {}; 
let currentAnalysis = null;
let currentUiLang = 'md';
let loadingInterval = null;
let currentSort = { col: 'count', dir: 'desc' }; // 預設依出現次數降序
let genController = null; // 用於取消生成
const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbxzjTTje0BqASPfhXPGDdrR84dEzplbFafbieFZ_SUJcg6UWm5VaEn20LR7B8cCOhY_8g/exec"; // 雲端同步網址

const uiTranslations = {
    md: {
        uiTitleMain: "文本分析助手", step1Text: "1. 輸入文本", step2Text: "2. 分析報告", step3Text: "3. AI 改寫文本",
        btnShowStats: "📊 統計專區", lblStatsTitle: "📊 網站數據統計", lblTotalVisitors: "累積造訪人次", lblRecentHistory: "最近分析動態",
        view1Title: "第一步：貼上原文", clear: "清除", lblLang: "目標語言", lblInterval: "統計字距", lblLimit: "常用字上限", start: "開始文本分析",
        inputText: "在此貼上您的文章...",
        view2Title: "第二步：分析報告", reset: "分析下一個文本", dlReport: "下載分析報表", lblTotalA: "總字數(A)", lblUniqueB: "相異字數(B)",
        aiBannerMsg: "分析完成！準備好進行 AI 改寫了嗎？", lblTargetLength: "目標長度 (原文的 %)", lblAiFreqLimit: "常用字上限 (5021排名)", goToGenerateBtn: "開始 AI 文本生成",
        lblUserApiKey: "個人 Gemini API Key (免金鑰限3次)",
        lblPrivacyNotice: "您的金鑰僅儲存於本機瀏覽器，系統不會記錄。",
        instr1Title: "1. 貼上原文", instr1Desc: "將您想分析的文章<br>貼進輸入框內。",
        instr2Title: "2. 文本分析", instr2Desc: "系統自動統計字頻排名<br>標註常用字分佈。",
        instr3Title: "3. AI 產出", instr3Desc: "設定目標長度與上限<br>生成適合的改寫文章。",
        lblDetailList: "詳細字頻清單", thChar: "字", thCount: "出現次數", thRank: "5021排名 / 700序號",
        thRange: "字距範圍", thTotalC: "總字數(C)", thUniqueD: "相異字數(D)", thRatioE: "總字數比(E)", thCumF: "總累積比(F)", thRatioG: "相異字數比(G)", thCumH: "相異累積比(H)", thLookup: "字庫查詢",
        view3Title: "第三步：AI 生成結果", back: "返回分析報告", dlTxt: "下載文本", 
        loadingHint: "請稍候，我們正在為您產出道地的文本",
        regen: "重新生成 (再扣 1 次額度)", lblQuota: "今日剩餘 AI 配額", lblTimes: "次",
        statuses_md: ["正在調用中語腦...", "正在搜尋中語用詞...", "正在優化中語語法...", "正在提煉、提煉、再提煉..."],
        statuses_tw: ["正在調用台語腦...", "正在搜揣台語用詞...", "正在排除中語語法...", "正在提煉、提煉、再提煉..."]
    },
    tw: {
        uiTitleMain: "文本分析助手", step1Text: "1. 輸入文本", step2Text: "2. 分析報告", step3Text: "3. AI 改寫文本",
        btnShowStats: "📊 統計專區", lblStatsTitle: "📊 網站數據統計", lblTotalVisitors: "累積造訪人次", lblRecentHistory: "最近分析動態",
        view1Title: "第一步：貼原文", clear: "清空", lblLang: "目標語言", lblInterval: "統計字距", lblLimit: "捷用字上限", start: "開始分析文本",
        inputText: "共你的文章貼來遮...",
        view2Title: "第二步：分析報告", reset: "分析另外一篇", dlReport: "下載報表", lblTotalA: "總字數(A)", lblUniqueB: "相異字數(B)",
        aiBannerMsg: "分析好矣！欲開始 AI 改寫無？", lblTargetLength: "目標長度 (原文的 %)", lblAiFreqLimit: "捷用字上限 (5021排名)", goToGenerateBtn: "開始 AI 生成",
        lblUserApiKey: "個人 Gemini API Key (免金鑰限3次)",
        lblPrivacyNotice: "你的金鎖匙干焦會儉佇你的瀏覽器內底，系統袂留紀錄。",
        instr1Title: "1. 貼原文", instr1Desc: "共您想欲分析的文章<br>貼佇輸入格仔內。",
        instr2Title: "2. 分析報告", instr2Desc: "系統自動統計字頻佮排名<br>標示捷用字分佈。",
        instr3Title: "3. AI 改寫", instr3Desc: "設定目標長度佮捷用字上限<br>生成適合的改寫文章。",
        lblDetailList: "詳細字頻清單", thChar: "字", thCount: "出現回數", thRank: "5021排名 / 700序號",
        thRange: "字距範圍", thTotalC: "總字數(C)", thUniqueD: "相異字數(D)", thRatioE: "總字數比(E)", thCumF: "總字數累積(F)", thRatioG: "相異字數比(G)", thCumH: "相異累積比(H)", thLookup: "字庫查詢",
        view3Title: "第三步：AI 生成結果", back: "倒轉去分析報告", dlTxt: "下載文本", 
        loadingHint: "請小等一下，當咧為您產出道地的文本",
        regen: "重做一遍 (會扣 1 个份額)", lblQuota: "今仔日 AI 份額賰", lblTimes: "个",
        statuses_md: ["當咧調用中語腦...", "當咧揣中語的詞...", "當咧調整中語句型...", "當咧提煉、提煉、閣再提煉..."],
        statuses_tw: ["當咧調用台語腦...", "當咧搜揣在地用詞...", "當咧排除中語語法...", "當咧提煉、提煉、閣再提煉..."]
    }
};

const get = id => document.getElementById(id);
const views = { editor: 'viewEditor', report: 'viewReport', result: 'viewResult', loading: 'loading' };
const stepEls = { 1: 'step1Text', 2: 'step2Text', 3: 'step3Text' };

function norm(c) {
    const map = { '台': '臺', '裏': '裡', '恆': '恆', '双': '雙' };
    return map[c] || c;
}

document.addEventListener('DOMContentLoaded', async () => {
    // 讀取記憶的 API Key
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey && get('userApiKey')) {
        get('userApiKey').value = savedKey;
    }

    // 監聽 API Key 輸入，自動儲存
    get('userApiKey').onchange = (e) => {
        localStorage.setItem('gemini_api_key', e.target.value.trim());
    };

    try {
        const res = await fetch('data/word_db.json');
        const data = await res.json();
        data.taiwanese.forEach(i => twMap[i.word] = i.rank);
        data.mandarin.forEach(i => mdMap[i.word] = i.rank);
        console.log("Original Logic Re-initialized");
    } catch (e) {}

    // 預設語言與初始資訊載入
    switchUiLanguage('md');
    updateQuotaDisplay();
    fetchStats();
});

function switchUiLanguage(lang) {
    currentUiLang = lang;
    const t = uiTranslations[lang];
    Object.keys(t).forEach(id => {
        const el = get(id);
        if (el) {
            if (el.tagName === 'TEXTAREA') el.placeholder = t[id];
            else el.innerHTML = t[id]; // 使用 innerHTML 支援換行
        }
    });
    // 強制點亮綠光
    get('uiLangMd').classList.toggle('active', lang === 'md');
    get('uiLangTw').classList.toggle('active', lang === 'tw');
    
    const classes = ['clear', 'reset', 'start', 'dlReport', 'back', 'dlTxt', 'regen'];
    classes.forEach(cls => document.querySelectorAll(`.ui-${cls}`).forEach(el => el.textContent = t[cls] || el.textContent));
}

function switchView(name, step) {
    Object.values(views).forEach(v => get(v).classList.add('hidden'));
    get(views[name]).classList.remove('hidden');
    Object.values(stepEls).forEach(s => get(s).classList.remove('active'));
    if (stepEls[step]) get(stepEls[step]).classList.add('active');
    window.scrollTo(0, 0);
}

async function analyzeText() {
    const text = get('inputText').value.trim();
    if (!text) return alert('請輸入文本');
    
    // 關鍵修正：只保留中文字進行分析 (CJK 範圍)
    const chars = text.split('').filter(c => /[\u4E00-\u9FFF]/.test(c));
    const freqMap = {};
    chars.forEach(c => {
        const n = norm(c);
        freqMap[n] = (freqMap[n] || 0) + 1;
    });
    
    try {
        currentAnalysis = { total: chars.length, unique: Object.keys(freqMap).length, freqMap };
        get('totalWords').textContent = currentAnalysis.total;
        get('uniqueWords').textContent = currentAnalysis.unique;
        
        renderReport(freqMap, parseInt(get('intervalSize').value));
        
        // 非同步同步到雲端，不等待它完成以免卡住 UI
        logToGoogleSheets(freqMap, 'analysis').catch(e => console.error(e));
        
        switchView('report', 2);
        updateQuotaDisplay();
        updateWordCountEstimation(); // 分析完立刻算出預估字數
    } catch (e) {
        alert("分析過程發生錯誤: " + e.message);
    }
}

function updateWordCountEstimation() {
    if (!currentAnalysis) return;
    const percent = parseInt(get('targetPercent').value);
    const est = Math.round(currentAnalysis.total * (percent / 100));
    get('estWordCount').textContent = `(約 ${est} 字)`;
}

async function updateQuotaDisplay() {
    try {
        const res = await fetch('/api/quota');
        const data = await res.json();
        const t = uiTranslations[currentUiLang];
        const label = currentUiLang === 'tw' ? `(免金鑰額度賰：${data.remaining} 次)` : `(免金鑰額度剩餘：${data.remaining} 次)`;
        get('quotaInfo').textContent = label;
    } catch (e) {
        console.error("無法取得配額資訊", e);
    }
}

function renderReport(freqMap, interval) {
    const body = get('distTableBody');
    body.innerHTML = '';
    
    // 【核心邏輯回歸】：絕對排名分桶
    const bucketSize = interval;
    const maxKnownRank = 5021;
    const buckets = {}; // 用絕對排名分組
    const unknownBucket = []; // 不在資料庫內的字
    
    Object.entries(freqMap).forEach(([word, count]) => {
        const rMd = mdMap[word];
        if (rMd && rMd <= maxKnownRank) {
            const bIdx = Math.floor((rMd - 1) / bucketSize);
            if (!buckets[bIdx]) buckets[bIdx] = [];
            buckets[bIdx].push({ word, count, rMd });
        } else {
            unknownBucket.push({ word, count, rMd: rMd || 99999 });
        }
    });

    let cumT = 0, cumU = 0;
    // 渲染資料庫內的區間
    for (let b = 0; b <= Math.floor((maxKnownRank-1)/bucketSize); b++) {
        if (!buckets[b]) continue;
        
        const start = b * bucketSize + 1;
        const end = (b + 1) * bucketSize;
        const words = buckets[b].sort((a, b) => a.rMd - b.rMd);
        
        const cT = words.reduce((s, x) => s + x.count, 0);
        const cU = words.length;
        cumT += cT; cumU += cU;

        const row = body.insertRow();
        row.innerHTML = `
            <td>${start}-${end}</td>
            <td>${cT}</td><td>${cU}</td>
            <td>${(cT/currentAnalysis.total*100).toFixed(1)}%</td><td>${(cumT/currentAnalysis.total*100).toFixed(1)}%</td>
            <td>${(cU/currentAnalysis.unique*100).toFixed(1)}%</td><td>${(cumU/currentAnalysis.unique*100).toFixed(1)}%</td>
            <td class="word-list-col">${words.map(w => {
                const rTw = twMap[w.word] || '';
                const cls = w.rMd <= 500 ? 'rank-top-500' : w.rMd <= 1000 ? 'rank-top-1000' : 'rank-common';
                return `<span class="badge ${cls}">${w.word}(${w.count})[${w.rMd}] ${rTw ? '⭐' : ''}</span>`;
            }).join(' ')}</td>
        `;
    }

    // 渲染超出區間或不明字 (攏 會出現在這裡)
    if (unknownBucket.length > 0) {
        const words = unknownBucket.sort((a, b) => a.rMd - b.rMd);
        const cT = words.reduce((s, x) => s + x.count, 0);
        const cU = words.length;
        cumT += cT; cumU += cU;

        const row = body.insertRow();
        row.innerHTML = `
            <td>超出排名/未知</td>
            <td>${cT}</td><td>${cU}</td>
            <td>${(cT/currentAnalysis.total*100).toFixed(1)}%</td><td>${(cumT/currentAnalysis.total*100).toFixed(1)}%</td>
            <td>${(cU/currentAnalysis.unique*100).toFixed(1)}%</td><td>${(cumU/currentAnalysis.unique*100).toFixed(1)}%</td>
            <td class="word-list-col">${words.map(w => {
                const rTw = twMap[w.word] || '';
                return `<span class="badge rank-unknown">${w.word}(${w.count})[${w.rMd > maxKnownRank ? '?' : w.rMd}] ${rTw ? '⭐' : ''}</span>`;
            }).join(' ')}</td>
        `;
    }

    // --- 詳細清單排序與渲染 ---
    const tbody = get('freqTable').querySelector('tbody');
    tbody.innerHTML = '';
    
    // 建立基礎資料陣列
    const sortedData = Object.entries(freqMap).map(([char, count]) => ({
        char,
        count,
        mdRank: mdMap[char] || 99999,
        twRank: twMap[char] || 99999
    }));

    // 執行排序
    sortedData.sort((a, b) => {
        let valA = a[currentSort.col], valB = b[currentSort.col];
        if (currentSort.dir === 'asc') return valA - valB;
        return valB - valA;
    });

    // 渲染表格
    tbody.innerHTML = sortedData.map(item => {
        const rMd = item.mdRank === 99999 ? 'N/A' : item.mdRank;
        const rTw = item.twRank === 99999 ? '-' : item.twRank;
        return `<tr>
            <td>${item.char}</td>
            <td>${item.count}</td>
            <td>${rMd}</td>
            <td>${rTw}</td>
        </tr>`;
    }).join('');

    // 更新 Header 視覺狀態
    updateSortHeaders();
}

function updateSortHeaders() {
    const headers = { count: 'thCount', mdRank: 'thMdRank', twRank: 'thTwRank' };
    Object.entries(headers).forEach(([col, id]) => {
        const el = get(id);
        if (!el) return;
        el.classList.toggle('active-sort', currentSort.col === col);
        const icon = el.querySelector('i');
        if (icon) {
            if (currentSort.col === col) {
                icon.className = currentSort.dir === 'desc' ? 'fas fa-sort-down' : 'fas fa-sort-up';
            } else {
                icon.className = 'fas fa-sort';
            }
        }
    });
}

function handleSort(col) {
    if (currentSort.col === col) {
        currentSort.dir = currentSort.dir === 'desc' ? 'asc' : 'desc';
    } else {
        currentSort.col = col;
        currentSort.dir = 'desc';
    }
    renderReport(currentAnalysis.freqMap, parseInt(get('intervalSize').value));
}

async function logToGoogleSheets(data, type = 'analysis') {
    if (!GOOGLE_SHEETS_URL) return;
    
    let payload = { type: type, timestamp: new Date().toISOString() };
    
    if (type === 'analysis') {
        payload.data = Object.entries(data).map(([char, count]) => ({
            char,
            count,
            mdRank: mdMap[char] || '',
            twRank: twMap[char] || ''
        }));
    } else if (type === 'error') {
        payload.message = data.message;
        payload.details = data.details || '';
    } else if (type === 'performance') {
        payload.est_sec = data.estSec;
        payload.actual_sec = data.actualSec;
        payload.lang = data.lang;
        payload.word_count = data.wordCount;
    }

    try {
        await fetch(GOOGLE_SHEETS_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        console.log(`數據(${type})已發送至 Google 試算表`);
    } catch (e) {
        console.error("雲端同步失敗:", e);
    }
}

async function generateText() {
    const userKey = get('userApiKey').value.trim();
    const targetWords = Math.round(currentAnalysis.total * (parseInt(get('targetPercent').value) / 100));
    
    // 初始化 AbortController
    genController = new AbortController();
    
    get('aiOutputContainer').classList.add('hidden');
    switchView('loading', 0); // 切換到載入畫面

    // 預估時間邏輯 (基礎 5s + 每 100 字 2s)
    const estSec = 5 + Math.ceil(targetWords / 100) * 2;
    get('estTimeDisplay').textContent = `預估處理時間：約 ${estSec} 秒`;

    let progress = 0;
    const bar = get('progressBar'), wheel = get('wheelWrapper');
    let secondsElapsed = 0;
    
    // 根據「目標改寫語言」選擇對應的腦部訊息 (不論介面語系)
    const targetLang = get('langSelect').value; // 'md' or 'tw'
    const statusKey = targetLang === 'tw' ? 'statuses_tw' : 'statuses_md';
    const statusList = uiTranslations[currentUiLang][statusKey];

    get('actualTimeDisplay').textContent = currentUiLang === 'tw' ? "實際經過時間：0 秒" : "實際已過時間：0 秒";

    loadingInterval = setInterval(() => {
        secondsElapsed++;
        if (progress < 90) progress += (90 - progress) / (estSec * 0.5); // 動態進度
        bar.style.width = wheel.style.left = Math.min(95, progress) + '%';
        
        get('actualTimeDisplay').textContent = currentUiLang === 'tw' ? `實際經過時間：${secondsElapsed} 秒` : `實際已過時間：${secondsElapsed} 秒`;
        
        // 從選定的清單中隨機取樣
        get('loadingStatus').textContent = statusList[Math.floor(Math.random() * statusList.length)];

        // 30 秒提醒 (強化視覺)
        if (secondsElapsed === 30) {
            get('loadingHint').innerHTML = '<span style="color: #fbbf24; font-size: 1.1rem; font-weight: bold;">⚠️ 伺服器正在努力中，請稍候...</span>';
        }
        // 90 秒強制超時 (防卡死)
        if (secondsElapsed === 90) {
            cancelGeneration();
            alert('抱歉，此次生成逾時 (90秒)。可能是因為文本過長或網路不穩，建議您將文章拆分後重試，或是稍後再試。');
        }
    }, 1000);

    try {
        // 建立一個 60 秒的超時 Promise
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("TIMEOUT")), 60000)
        );

        // 使用 Promise.race 讓 API 請求與超時鬧鐘比賽
        const res = await Promise.race([
            fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: genController.signal,
                body: JSON.stringify({ 
                    text: get('inputText').value, 
                    lang: get('langSelect').value, 
                    freq_limit: parseInt(get('aiFreqLimit').value), 
                    word_count: targetWords,
                    user_api_key: userKey
                })
            }),
            timeoutPromise
        ]);
        
        if (res.status === 429) throw new Error("BUSY");

        let data;
        try {
            data = await res.json();
        } catch (e) {
            throw new Error("伺服器回傳格式錯誤 (可能連線不穩)");
        }

        if (data.text === "FREE_QUOTA_EXCEEDED") {
            clearInterval(loadingInterval);
            alert(currentUiLang === 'tw' ? '您今仔日的 3 次免金鑰額度已經用完矣，請填入您的個人 API Key 繼續使用。' : '您今日的 3 次免金鑰額度已用完，請填入您的個人 API Key 繼續使用。');
            switchView('report', 2);
            get('userApiKey').focus();
            get('userApiKey').scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        bar.style.width = '100%';
        setTimeout(() => {
            // 清洗文本：移除常見的前言廢話
            let cleanedText = data.text.replace(/^(這是一份|這是一篇|好的|根據您的要求|這份台語教材).*?\n+/i, '');
            cleanedText = cleanedText.trim();
            
            // 紀錄效能數據到雲端
        logToGoogleSheets({ 
            estSec: estSec, 
            actualSec: secondsElapsed, 
            lang: get('langSelect').value,
            wordCount: targetWords
        }, 'performance');

        get('aiOutput').textContent = cleanedText;
            
            // 更新字數顯示
            const count = cleanedText.length;
            get('generatedWordCount').textContent = `(生成字數 ${count} 字)`;
            
            get('aiOutputContainer').classList.remove('hidden');
            get('loading').classList.add('hidden');
            clearInterval(loadingInterval);
        }, 500);
    } catch (error) {
        // 紀錄錯誤到雲端
        logToGoogleSheets({ 
            message: `生成失敗: ${error.message}`, 
            details: `目標字數: ${targetWords}, 語言: ${get('langSelect').value}` 
        }, 'error');

        if (error.name === 'AbortError') {
            console.log('生成已取消');
            return;
        }

        if (error.message === "TIMEOUT") {
            alert('抱歉，伺服器回應過慢 (超過60秒)。這可能是因為目前 Google API 負載較重，或您的文章篇幅較長。建議您稍後再試，或嘗試減少目標改寫字數。');
            switchView('report', 2);
            return;
        }

        if (error.message === "BUSY") {
            alert('您目前已有一個生成任務正在進行中。請等待目前的任務完成，或稍後再試。');
            switchView('report', 2);
            return;
        }

        alert(`執行發生錯誤：${error.message}`);
        switchView('report', 2);
    } finally {
        genController = null;
        clearInterval(loadingInterval);
        // 重要修正：確保載入畫面一定會隱藏，不管成功或失敗
        if (get('loading').classList.contains('active') || !get('loading').classList.contains('hidden')) {
            switchView('report', 2);
        }
    }
}

function cancelGeneration() {
    if (genController) {
        genController.abort();
        clearInterval(loadingInterval);
        switchView('report', 2);
        alert('已取消文本生成。');
    }
}

// 事件綁定
get('uiLangMd').onclick = () => switchUiLanguage('md');
get('uiLangTw').onclick = () => switchUiLanguage('tw');
get('mainTitle').onclick = () => switchView('editor', 1);
get('targetPercent').onchange = updateWordCountEstimation; // 連動更新預估字數
get('analyzeBtn').onclick = analyzeText;
get('clearBtn').onclick = () => get('inputText').value = '';
get('goToGenerateBtn').onclick = () => { switchView('result', 3); generateText(); };
document.querySelectorAll('.ui-reset').forEach(b => b.onclick = () => switchView('editor', 1));
document.querySelectorAll('.ui-back-report').forEach(b => b.onclick = () => switchView('report', 2));
get('regenerateBtn').onclick = generateText;
get('cancelGenBtn').onclick = cancelGeneration;

get('step1Text').onclick = () => switchView('editor', 1);
get('step2Text').onclick = () => currentAnalysis && switchView('report', 2);
get('step3Text').onclick = () => get('aiOutput').textContent && switchView('result', 3);
get('thCount').onclick = () => handleSort('count');
get('thMdRank').onclick = () => handleSort('mdRank');
get('thTwRank').onclick = () => handleSort('twRank');

async function fetchStats() {
    try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        get('footerVisitorCount').textContent = data.visitors;
    } catch(e) {
        console.error("無法取得造訪人次", e);
    }
}
get('downloadBtn').onclick = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([get('aiOutput').textContent], { type: 'text/plain' }));
    a.download = 'ai_rewrite.txt'; a.click();
};

get('downloadExcelBtn').onclick = () => {
    if (!currentAnalysis) return;

    // 1. 準備：統計總結數據
    const summaryData = [
        { "項目": "分析時間", "數值": new Date().toLocaleString() },
        { "項目": "總字數 (A)", "數值": currentAnalysis.total },
        { "項目": "相異字數 (B)", "數值": currentAnalysis.unique },
        { "項目": "目標語言", "數值": get('langSelect').value === 'tw' ? '台語' : '中語' }
    ];

    // 2. 準備：區間分佈分析數據 (重新計算桶子邏輯)
    const intervalData = [];
    const bucketSize = parseInt(get('intervalSize').value);
    const maxKnownRank = 5021;
    const buckets = {};
    const unknownBucket = [];
    
    Object.entries(currentAnalysis.freqMap).forEach(([word, count]) => {
        const rMd = mdMap[word];
        if (rMd && rMd <= maxKnownRank) {
            const bIdx = Math.floor((rMd - 1) / bucketSize);
            if (!buckets[bIdx]) buckets[bIdx] = [];
            buckets[bIdx].push({ word, count, rMd });
        } else {
            unknownBucket.push({ word, count, rMd: rMd || 99999 });
        }
    });

    let cumT = 0, cumU = 0;
    for (let b = 0; b <= Math.floor((maxKnownRank-1)/bucketSize); b++) {
        if (!buckets[b]) continue;
        const start = b * bucketSize + 1, end = (b + 1) * bucketSize;
        const words = buckets[b];
        const cT = words.reduce((s, x) => s + x.count, 0);
        const cU = words.length;
        cumT += cT; cumU += cU;

        intervalData.push({
            "字距範圍": `${start}-${end}`,
            "總字數(C)": cT,
            "相異字數(D)": cU,
            "總字數比(E)%": (cT/currentAnalysis.total*100).toFixed(1),
            "總字數累積(F)%": (cumT/currentAnalysis.total*100).toFixed(1),
            "相異字數比(G)%": (cU/currentAnalysis.unique*100).toFixed(1),
            "相異累積比(H)%": (cumU/currentAnalysis.unique*100).toFixed(1)
        });
    }
    if (unknownBucket.length > 0) {
        const cT = unknownBucket.reduce((s, x) => s + x.count, 0);
        const cU = unknownBucket.length;
        cumT += cT; cumU += cU;
        intervalData.push({
            "字距範圍": "超出排名/未知",
            "總字數(C)": cT,
            "相異字數(D)": cU,
            "總字數比(E)%": (cT/currentAnalysis.total*100).toFixed(1),
            "總字數累積(F)%": (cumT/currentAnalysis.total*100).toFixed(1),
            "相異字數比(G)%": (cU/currentAnalysis.unique*100).toFixed(1),
            "相異累積比(H)%": (cumU/currentAnalysis.unique*100).toFixed(1)
        });
    }

    // 3. 準備：詳細字頻清單數據
    const freqData = Object.entries(currentAnalysis.freqMap).map(([char, count]) => ({
        "字": char,
        "出現次數": count,
        "中語 5021 排名": mdMap[char] || 'N/A',
        "台語 700 序號": twMap[char] || '-'
    }));
    freqData.sort((a, b) => b["出現次數"] - a["出現次數"]);

    // 4. 建立活頁簿與工作表
    const wb = XLSX.utils.book_new();
    const wsSum = XLSX.utils.json_to_sheet(summaryData);
    const wsInterval = XLSX.utils.json_to_sheet(intervalData);
    const wsFreq = XLSX.utils.json_to_sheet(freqData);

    XLSX.utils.book_append_sheet(wb, wsSum, "統計總結");
    XLSX.utils.book_append_sheet(wb, wsInterval, "區間分佈分析");
    XLSX.utils.book_append_sheet(wb, wsFreq, "詳細字頻清單");

    // 5. 下載檔案
    XLSX.writeFile(wb, `41研究室_文本分析報告_${new Date().getTime()}.xlsx`);
};
