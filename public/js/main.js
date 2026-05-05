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
        instr1Title: "貼上原文", instr1Desc: "在輸入框貼上您想分析的文章。",
        instr2Title: "文本分析", instr2Desc: "系統自動統計字頻與 5021 排名，標註常用字分佈。",
        instr3Title: "AI 產出", instr3Desc: "設定目標長度與常用字上限，生成適合的中語/台語文章。",
        lblDetailList: "詳細字頻清單", thChar: "字", thCount: "出現次數", thRank: "5021排名 / 700序號",
        thRange: "字距範圍", thTotalC: "總字數(C)", thUniqueD: "相異字數(D)", thRatioE: "總字數比(E)", thCumF: "總累積比(F)", thRatioG: "相異字數比(G)", thCumH: "相異累積比(H)", thLookup: "字庫查詢",
        view3Title: "第三步：AI 生成結果", back: "返回分析報告", dlTxt: "下載文本", loadingStatus: "正在調用中語腦...", loadingHint: "請稍候，我們正在為您產出道地的文本",
        regen: "重新生成 (再扣 1 次額度)", lblQuota: "今日剩餘 AI 配額", lblTimes: "次",
        statuses: ["正在調用中語腦...", "正在搜尋在地用詞...", "正在排除冗餘語法...", "正在提煉、提煉、再提煉...", "正在愛台灣..."]
    },
    tw: {
        uiTitleMain: "文本分析助手", step1Text: "1. 輸入文本", step2Text: "2. 分析報告", step3Text: "3. AI 改寫文本",
        btnShowStats: "📊 統計專區", lblStatsTitle: "📊 網站數據統計", lblTotalVisitors: "累積造訪人次", lblRecentHistory: "最近分析動態",
        view1Title: "第一步：貼原文", clear: "清空", lblLang: "目標語言", lblInterval: "統計字距", lblLimit: "捷用字上限", start: "開始分析文本",
        inputText: "共你的文章貼來遮...",
        view2Title: "第二步：分析報告", reset: "分析另外一篇", dlReport: "下載報表", lblTotalA: "總字數(A)", lblUniqueB: "相異字數(B)",
        aiBannerMsg: "分析好矣！欲開始 AI 改寫無？", lblTargetLength: "目標長度 (原文的 %)", lblAiFreqLimit: "捷用字上限 (5021排名)", goToGenerateBtn: "開始 AI 生成",
        lblUserApiKey: "個人 Gemini API Key (免金鑰限3次)",
        lblPrivacyNotice: "您的金鑰干焦儲佇您的瀏覽器，系統袂記錄。",
        instr1Title: "貼原文", instr1Desc: "共您想欲分析的文章貼佇輸入格仔內。",
        instr2Title: "分析報告", instr2Desc: "系統自動統計字頻佮排名，標示捷用字分佈。",
        instr3Title: "AI 改寫", instr3Desc: "設定目標長度佮捷用字上限，生成適合的中語/台語文章。",
        lblDetailList: "詳細字頻清單", thChar: "字", thCount: "出現回數", thRank: "5021排名 / 700序號",
        thRange: "字距範圍", thTotalC: "總字數(C)", thUniqueD: "相異字數(D)", thRatioE: "總字數比(E)", thCumF: "總字數累積(F)", thRatioG: "相異字數比(G)", thCumH: "相異累積比(H)", thLookup: "字庫查詢",
        view3Title: "第三步：AI 生成結果", back: "倒轉去分析報告", dlTxt: "下載文本", loadingStatus: "當咧調用台語腦...", loadingHint: "請小等一下，當咧為您產出道地的文本",
        regen: "重做一遍 (會扣 1 个份額)", lblQuota: "今仔日 AI 份額賰", lblTimes: "个",
        statuses: ["當咧調用台語腦...", "當咧搜揣在地用詞...", "當咧排除中語語法...", "當咧提煉、提煉、再提煉...", "當咧愛台灣..."]
    }
};

const get = id => document.getElementById(id);
const views = { editor: 'viewEditor', report: 'viewReport', result: 'viewResult', stats: 'viewStats', loading: 'loading' };
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
});

function switchUiLanguage(lang) {
    currentUiLang = lang;
    const t = uiTranslations[lang];
    Object.keys(t).forEach(id => {
        const el = get(id);
        if (el) {
            if (el.tagName === 'TEXTAREA') el.placeholder = t[id];
            else el.textContent = t[id];
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
    
    currentAnalysis = { total: chars.length, unique: Object.keys(freqMap).length, freqMap };
    get('totalWords').textContent = currentAnalysis.total;
    get('uniqueWords').textContent = currentAnalysis.unique;
    
    renderReport(freqMap, parseInt(get('intervalSize').value));
    
    // 自動同步到雲端試算表
    logToGoogleSheets(freqMap, mdMap, twMap);
    
    switchView('report', 2);
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

async function logToGoogleSheets(freqMap, mdMap, twMap) {
    if (!GOOGLE_SHEETS_URL) return;
    
    const payload = Object.entries(freqMap).map(([char, count]) => ({
        char,
        count,
        mdRank: mdMap[char] || '',
        twRank: twMap[char] || ''
    }));

    try {
        await fetch(GOOGLE_SHEETS_URL, {
            method: 'POST',
            mode: 'no-cors', // 跨網域存取
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        console.log("數據已發送至 Google 試算表");
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
    const bar = get('progressBar');
    let secondsElapsed = 0;

    loadingInterval = setInterval(() => {
        secondsElapsed++;
        if (progress < 90) progress += (90 - progress) / (estSec * 0.5); // 動態進度
        bar.style.width = Math.min(95, progress) + '%';
        
        const ss = uiTranslations[currentUiLang].statuses;
        get('loadingStatus').textContent = ss[Math.floor(Math.random()*ss.length)];

        // 30 秒提醒
        if (secondsElapsed === 30) {
            get('loadingHint').innerHTML = '<span style="color: #fbbf24;">⚠️ 伺服器回應稍慢，可能是長文本或網路波動，請再稍候...</span>';
        }
        // 60 秒提醒
        if (secondsElapsed === 60) {
            alert('生成時間已超過一分鐘。這通常是因為 Google API 配額吃緊或文章過長。您可以選擇繼續等待，或是取消後重試。');
        }
    }, 1000);

    try {
        const res = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: genController.signal, // 綁定取消信號
            body: JSON.stringify({ 
                text: get('inputText').value, 
                lang: get('langSelect').value, 
                freq_limit: parseInt(get('aiFreqLimit').value), 
                word_count: targetWords,
                user_api_key: userKey
            })
        });
        
        const data = await res.json();
        
        if (res.status === 429) { // BUSY
            throw new Error("BUSY");
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
            
            get('aiOutput').textContent = cleanedText;
            
            // 更新字數顯示
            const count = cleanedText.length;
            get('generatedWordCount').textContent = `(生成字數 ${count} 字)`;
            
            get('aiOutputContainer').classList.remove('hidden');
            get('loading').classList.add('hidden');
            clearInterval(loadingInterval);
        }, 500);
    } catch (error) {
        get('loading').classList.add('hidden');
        
        if (error.name === 'AbortError') {
            console.log('生成已取消');
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
get('analyzeBtn').onclick = analyzeText;
get('clearBtn').onclick = () => get('inputText').value = '';
get('goToGenerateBtn').onclick = () => { switchView('result', 3); generateText(); };
document.querySelectorAll('.ui-reset').forEach(b => b.onclick = () => switchView('editor', 1));
document.querySelectorAll('.ui-back-report').forEach(b => b.onclick = () => switchView('report', 2));
get('regenerateBtn').onclick = generateText;
get('cancelGenBtn').onclick = cancelGeneration;
get('btnShowStats').onclick = () => {
    const isStats = !get('viewStats').classList.contains('hidden');
    isStats ? switchView('editor', 1) : (switchView('stats', 0), fetchStats());
};
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
        get('visitorCount').textContent = data.visitors;
        get('statsHistory').innerHTML = data.history.map(h => `<div class="history-item"><span class="hist-time">${h.time}</span><span class="hist-preview">${h.preview}</span><span class="hist-count">${h.count} 字</span></div>`).join('');
    } catch(e) {}
}
get('downloadBtn').onclick = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([get('aiOutput').textContent], { type: 'text/plain' }));
    a.download = 'ai_rewrite.txt'; a.click();
};

get('downloadExcelBtn').onclick = () => {
    if (!currentAnalysis) return;

    // 1. 準備詳細清單數據
    const freqData = Object.entries(currentAnalysis.freqMap).map(([char, count]) => ({
        "字": char,
        "出現次數": count,
        "中語 5021 排名": mdMap[char] || 'N/A',
        "台語 700 序號": twMap[char] || '-'
    }));
    
    // 依出現次數降序排列
    freqData.sort((a, b) => b["出現次數"] - a["出現次數"]);

    // 2. 準備統計總結數據
    const summaryData = [
        { "項目": "分析時間", "數值": new Date().toLocaleString() },
        { "項目": "總字數(A)", "數值": currentAnalysis.total },
        { "項目": "相異字數(B)", "數值": currentAnalysis.unique },
        { "項目": "目標語言", "數值": get('langSelect').value === 'tw' ? '台語' : '中語' }
    ];

    // 3. 建立活頁簿
    const wb = XLSX.utils.book_new();
    const wsFreq = XLSX.utils.json_to_sheet(freqData);
    const wsSum = XLSX.utils.json_to_sheet(summaryData);

    XLSX.utils.book_append_sheet(wb, wsFreq, "詳細字頻清單");
    XLSX.utils.book_append_sheet(wb, wsSum, "統計總結");

    // 4. 下載檔案
    XLSX.writeFile(wb, `41研究室_文本分析報告_${new Date().getTime()}.xlsx`);
};
