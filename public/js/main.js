/**
 * 41 研究室 - 文本分析助手 (main.js)
 * 恢復原始專業版：撤銷精簡化，恢復絕對排名分區邏輯
 */

let mdMap = {}, twMap = {}; 
let currentAnalysis = null;
let currentUiLang = 'md';
let loadingInterval = null;

const uiTranslations = {
    md: {
        uiTitleMain: "文本分析助手", step1Text: "1. 輸入文本", step2Text: "2. 分析報告", step3Text: "3. AI 改寫文本",
        btnShowStats: "📊 統計專區", lblStatsTitle: "📊 網站數據統計", lblTotalVisitors: "累積造訪人次", lblRecentHistory: "最近分析動態",
        view1Title: "第一步：貼上原文", clear: "清除", lblLang: "目標語言", lblInterval: "統計字距", lblLimit: "常用字上限", start: "開始文本分析",
        inputText: "在此貼上您的文章...",
        view2Title: "第二步：分析報告", reset: "分析下一個文本", dlReport: "下載分析報表", lblTotalA: "總字數(A)", lblUniqueB: "相異字數(B)",
        aiBannerMsg: "分析完成！準備好進行 AI 改寫了嗎？", lblTargetLength: "目標長度 (原文的 %)", goToGenerateBtn: "開始 AI 文本生成",
        lblDetailList: "詳細字頻清單", thChar: "字", thCount: "出現次數", thRank: "5021排名 / 700序號",
        thRange: "字距範圍", thTotalC: "總字數(C)", thUniqueD: "相異字數(D)", thRatioE: "總字數比(E)", thCumF: "總累積比(F)", thRatioG: "相異字數比(G)", thCumH: "相異累積比(H)", thLookup: "字庫查詢",
        view3Title: "第三步：AI 生成結果", back: "返回分析報告", dlTxt: "下載文本", loadingStatus: "正在調用中語腦...", loadingHint: "請稍候，我們正在為您產出道地的文本",
        regen: "重新生成 (再扣 1 次額度)", lblQuota: "今日剩餘 AI 配額", lblTimes: "次",
        statuses: ["正在調用中語腦...", "正在搜尋在地用詞...", "正在排除冗餘語法...", "正在提煉、提煉、再提煉...", "正在愛台灣..."]
    },
    tw: {
        uiTitleMain: "文本分析助手", step1Text: "1. 輸入文本", step2Text: "2. 分析報告", step3Text: "3. AI 改寫文本",
        btnShowStats: "📊 統計專區", lblStatsTitle: "📊 網站數據統計", lblTotalVisitors: "累積造訪人次", lblRecentHistory: "最近分析動態",
        view1Title: "第一步：貼原文", clear: "清空", lblLang: "目標語言", lblInterval: "統計字距", lblLimit: "常用字上限", start: "開始分析文本",
        inputText: "共你的文章貼來遮...",
        view2Title: "第二步：分析報告", reset: "分析另外一篇", dlReport: "下載報表", lblTotalA: "總字數(A)", lblUniqueB: "相異字數(B)",
        aiBannerMsg: "分析好矣！欲開始 AI 改寫無？", lblTargetLength: "目標長度 (原文的 %)", goToGenerateBtn: "開始 AI 生成",
        lblDetailList: "詳細字頻清單", thChar: "字", thCount: "出現回數", thRank: "5021排名 / 700序號",
        thRange: "字距範圍", thTotalC: "總字數(C)", thUniqueD: "相異字數(D)", thRatioE: "總字數比(E)", thCumF: "總字數累積(F)", thRatioG: "相異字數比(G)", thCumH: "相異累積比(H)", thLookup: "字庫查詢",
        view3Title: "第三步：AI 生成結果", back: "倒轉去分析報告", dlTxt: "下載文本", loadingStatus: "當咧調用台語腦...", loadingHint: "請小等一下，當咧為您產出道地的文本",
        regen: "重做一遍 (會扣 1 个份額)", lblQuota: "今仔日 AI 份額賰", lblTimes: "个",
        statuses: ["當咧調用台語腦...", "當咧搜揣在地用詞...", "當咧排除中語語法...", "當咧提煉、提煉、再提煉...", "當咧愛台灣..."]
    }
};

const get = id => document.getElementById(id);
const views = { editor: 'viewEditor', report: 'viewReport', result: 'viewResult', stats: 'viewStats' };
const stepEls = { 1: 'step1Text', 2: 'step2Text', 3: 'step3Text' };

function norm(c) {
    const map = { '台': '臺', '裏': '裡', '恆': '恆', '双': '雙' };
    return map[c] || c;
}

document.addEventListener('DOMContentLoaded', async () => {
    fetchQuota();
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

    // 詳細清單依排名排
    const all = Object.entries(freqMap).sort((a, b) => (mdMap[a[0]] || 99999) - (mdMap[b[0]] || 99999));
    get('freqTable').querySelector('tbody').innerHTML = all.map(([c, count]) => {
        const rMd = mdMap[c] || 'N/A', rTw = twMap[c] || '-';
        return `<tr><td>${c}</td><td>${count}</td><td>${rMd} / ${rTw}</td></tr>`;
    }).join('');
}

async function generateText() {
    const targetWords = Math.round(currentAnalysis.total * (parseInt(get('targetPercent').value) / 100));
    get('aiOutputContainer').classList.add('hidden');
    get('loading').classList.remove('hidden');
    
    let progress = 0;
    const bar = get('progressBar'), wheel = get('wheelWrapper');
    loadingInterval = setInterval(() => {
        if (progress < 90) progress += Math.random() * 5;
        bar.style.width = wheel.style.left = Math.min(90, progress) + '%';
        const ss = uiTranslations[currentUiLang].statuses;
        get('loadingStatus').textContent = ss[Math.floor(Math.random()*ss.length)];
    }, 2000);

    try {
        const res = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: get('inputText').value, lang: get('langSelect').value, freq_limit: parseInt(get('freqLimit').value), word_count: targetWords })
        });
        const data = await res.json();
        bar.style.width = wheel.style.left = '100%';
        setTimeout(() => {
            get('aiOutput').textContent = data.text;
            get('aiOutputContainer').classList.remove('hidden');
            fetchQuota();
            get('loading').classList.add('hidden');
            clearInterval(loadingInterval);
        }, 500);
    } catch (e) {
        get('loading').classList.add('hidden');
        clearInterval(loadingInterval);
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
get('btnShowStats').onclick = () => {
    const isStats = !get('viewStats').classList.contains('hidden');
    isStats ? switchView('editor', 1) : (switchView('stats', 0), fetchStats());
};
get('step1Text').onclick = () => switchView('editor', 1);
get('step2Text').onclick = () => currentAnalysis && switchView('report', 2);
get('step3Text').onclick = () => get('aiOutput').textContent && switchView('result', 3);

async function fetchStats() {
    try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        get('visitorCount').textContent = data.visitors;
        get('statsHistory').innerHTML = data.history.map(h => `<div class="history-item"><span class="hist-time">${h.time}</span><span class="hist-preview">${h.preview}</span><span class="hist-count">${h.count} 字</span></div>`).join('');
    } catch(e) {}
}
async function fetchQuota() {
    try {
        const res = await fetch('/api/quota');
        const data = await res.json();
        get('remainingQuota').textContent = data.remaining;
    } catch(e) {}
}
get('downloadBtn').onclick = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([get('aiOutput').textContent], { type: 'text/plain' }));
    a.download = 'ai_rewrite.txt'; a.click();
};
