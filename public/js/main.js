/**
 * 41 研究室 - 文本分析助手
 * 純前端：文本分析、提示詞產生器、（階段 3）識字量測驗。
 * 只有造訪人次計數會呼叫 /api/visits。
 */
(() => {
'use strict';

const $ = id => document.getElementById(id);
const HAN = /[㐀-䶿一-鿿]/; // 含擴充 A 區
const NORM = { '台': '臺', '裏': '裡', '双': '雙' };
const norm = c => NORM[c] || c;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MAX_RANK = 5021;

const state = {
  lang: 'md',
  theme: 'light',
  limit: 1000,
  tab: 'analysis',
  view: 'input', // 文本分析分頁：input | result
  analysis: null,
  mdMap: new Map(),   // 字 -> 中語字頻排名
  twMap: new Map(),   // 詞 -> [台語推薦用字條目]
  twMaxLen: 1,
  mdCount: 4981,
  visits: null,
  sort: { col: 'count', dir: 'desc' },
  dbReady: null,
  dbFailed: false,
};

const langListeners = [];

/* ---------- 工具 ---------- */
function t(key, vars) {
  const dict = window.I18N[state.lang] || {};
  let s = dict[key] ?? window.I18N.md[key] ?? key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m));
  return s;
}
const fmt = n => Number(n).toLocaleString('en-US');
const pct = (a, b) => (b ? (a / b * 100) : 0).toFixed(1);
const sum = (arr, f) => arr.reduce((s, x) => s + f(x), 0);

let toastTimer = null;
function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
}

function store(key, val) { try { localStorage.setItem(key, val); } catch (e) {} }
function load(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }

/* ---------- 字頻分級 ---------- */
const tierOf = r => (!r || r > MAX_RANK) ? 4 : r <= 500 ? 1 : r <= 1000 ? 2 : 3;
const tierCls = tier => tier === 3 ? 't3 edge' : 't' + tier;
const isOver = (r, limit) => !r || r > limit;

const BANDS = (() => {
  const b = [];
  for (let s = 1; s < 1000; s += 100) b.push({ a: s, b: s + 99 });
  for (let s = 1001; s <= 4001; s += 1000) b.push({ a: s, b: s === 4001 ? MAX_RANK : s + 999 });
  return b;
})();

/* ---------- 介面語言與主題 ---------- */
function applyI18n() {
  const vars = { n: fmt(state.mdCount) };
  document.querySelectorAll('[data-i]').forEach(el => { el.textContent = t(el.dataset.i, vars); });
  document.querySelectorAll('[data-i-ph]').forEach(el => { el.placeholder = t(el.dataset.iPh); });
  document.querySelectorAll('[data-i-label]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.iLabel)); });
  $('themeToggle').setAttribute('aria-label', t(state.theme === 'dark' ? 'aria.toLight' : 'aria.toDark'));
  renderLegends();
  $('srcLegend').textContent = t('src.legend');
}

function setLang(lang) {
  state.lang = lang;
  store('uiLang', lang);
  $('langMd').setAttribute('aria-pressed', String(lang === 'md'));
  $('langTw').setAttribute('aria-pressed', String(lang === 'tw'));
  applyI18n();
  renderCounter();
  updateCharCount();
  if (state.analysis) renderResults();
  renderPrompt();
  langListeners.forEach(fn => fn(lang));
}

function setTheme(theme) {
  state.theme = theme;
  store('theme', theme);
  const dark = theme === 'dark';
  document.body.classList.toggle('dark', dark);
  document.documentElement.classList.toggle('dark', dark);
  $('themeLight').setAttribute('aria-pressed', String(!dark));
  $('themeDark').setAttribute('aria-pressed', String(dark));
  $('themeToggle').setAttribute('aria-label', t(dark ? 'aria.toLight' : 'aria.toDark'));
}

function renderLegends() {
  const items = [1, 2, 3, 4].map(n =>
    `<span class="lg"><span class="sw ${tierCls(n)}"></span>${esc(t('tier.' + n))}</span>`).join('');
  document.querySelectorAll('[data-legend]').forEach(box => {
    box.querySelectorAll('.lg').forEach(x => x.remove());
    box.insertAdjacentHTML('afterbegin', items);
  });
}

/* ---------- 分頁 ---------- */
const TABS = ['analysis', 'prompt', 'exam'];
const tabId = n => 'tab' + n[0].toUpperCase() + n.slice(1);
const panelId = n => 'panel' + n[0].toUpperCase() + n.slice(1);

function setTab(name, focus) {
  state.tab = name;
  TABS.forEach(n => {
    const on = n === name;
    $(tabId(n)).setAttribute('aria-selected', String(on));
    $(tabId(n)).tabIndex = on ? 0 : -1;
    $(panelId(n)).hidden = !on;
  });
  if (focus) $(tabId(name)).focus();
  updateHero();
  if (name === 'prompt') renderPrompt();
}

function setView(view) {
  state.view = view;
  $('anaInput').hidden = view !== 'input';
  $('anaResult').hidden = view !== 'result';
  // 常用字上限只有一個欄位，跟著目前畫面搬位置
  $(view === 'result' ? 'limitSlotResult' : 'limitSlotInput').appendChild($('limitCard'));
  updateHero();
  window.scrollTo(0, 0);
}

function updateHero() {
  $('hero').hidden = !(state.tab === 'analysis' && state.view === 'input');
}

/* ---------- 造訪人次 ---------- */
function renderCounter() {
  const el = $('visitorDigits');
  const n = state.visits;
  if (n == null) {
    el.innerHTML = '<b>–</b>';
    el.setAttribute('aria-label', t('counter.none'));
    return;
  }
  const s = String(n);
  let h = '';
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) h += '<em>,</em>';
    h += `<b>${s[i]}</b>`;
  }
  el.innerHTML = h;
  el.setAttribute('aria-label', t('counter.aria', { n: fmt(n) }));
}

async function fetchVisits() {
  try {
    // 同一個瀏覽器分頁工作階段只計 1 次
    let counted = false;
    try { counted = sessionStorage.getItem('visitCounted') === '1'; } catch (e) {}
    const res = await fetch('/api/visits', { method: counted ? 'GET' : 'POST' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    if (!counted) { try { sessionStorage.setItem('visitCounted', '1'); } catch (e) {} }
    const data = await res.json();
    state.visits = Number.isFinite(data.visitors) ? data.visitors : null;
  } catch (e) {
    console.warn('無法取得造訪人次', e);
    state.visits = null;
  }
  renderCounter();
}

/* ---------- 資料 ---------- */
async function loadDb() {
  try {
    const res = await fetch('data/word_db.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    data.mandarin.forEach(i => state.mdMap.set(i.word, i.rank));
    state.mdCount = data.mandarin.length;
    data.taiwanese.forEach(i => {
      if (!state.twMap.has(i.word)) state.twMap.set(i.word, []);
      state.twMap.get(i.word).push(i);
      state.twMaxLen = Math.max(state.twMaxLen, i.word.length);
    });
    applyI18n();
  } catch (e) {
    console.error('字庫載入失敗', e);
    state.dbFailed = true;
    $('dbError').hidden = false;
  }
}

/* ---------- 文本分析 ---------- */
function countHan(text) {
  let n = 0;
  for (const c of text) if (HAN.test(c)) n++;
  return n;
}

function updateCharCount() {
  $('charCount').textContent = t('input.count', { n: fmt(countHan($('inputText').value)) });
}

function analyze(text) {
  const freq = new Map();
  let total = 0;
  for (const raw of text) {
    if (!HAN.test(raw)) continue;
    const c = norm(raw);
    freq.set(c, (freq.get(c) || 0) + 1);
    total++;
  }
  const items = [...freq].map(([ch, count]) => ({ ch, count, rank: state.mdMap.get(ch) || null }));
  items.sort((a, b) => b.count - a.count || (a.rank ?? 1e9) - (b.rank ?? 1e9) || a.ch.localeCompare(b.ch));
  return { text, total, unique: items.length, items, twHits: matchTwWords(text) };
}

// 台語推薦用字多為詞：在原文中以「最長優先」比對詞，不逐字比對
function matchTwWords(text) {
  const counts = new Map();
  let i = 0;
  while (i < text.length) {
    let hit = null;
    for (let L = Math.min(state.twMaxLen, text.length - i); L >= 1; L--) {
      const w = text.substr(i, L);
      if (state.twMap.has(w)) { hit = w; break; }
    }
    if (hit) { counts.set(hit, (counts.get(hit) || 0) + 1); i += hit.length; } else { i++; }
  }
  return [...counts].map(([word, count]) => {
    const entries = state.twMap.get(word);
    const uniq = k => [...new Set(entries.map(e => e[k]).filter(Boolean))].join(' / ');
    return { word, count, reading: uniq('reading'), mandarin: uniq('mandarin') };
  }).sort((a, b) => b.count - a.count || a.word.localeCompare(b.word));
}

function groupBands(items) {
  const rows = BANDS.map(b => ({
    label: `${b.a}–${b.b}`, tier: b.b <= 500 ? 1 : b.b <= 1000 ? 2 : 3,
    items: items.filter(i => i.rank && i.rank >= b.a && i.rank <= b.b),
  }));
  rows.push({ label: t('band.over'), tier: 4, over: true, items: items.filter(i => !i.rank || i.rank > MAX_RANK) });
  rows.forEach(r => { r.occ = sum(r.items, i => i.count); r.kinds = r.items.length; });
  return rows;
}

function renderResults() {
  const a = state.analysis;
  if (!a) return;
  const { items, total, unique } = a;

  // 摘要卡
  const cover = sum(items.filter(i => i.rank && i.rank <= 1000), i => i.count);
  const over = items.filter(i => isOver(i.rank, state.limit));
  const overOcc = sum(over, i => i.count);
  const u = esc(t('unit.char'));
  $('summaryCards').innerHTML = `
    <div class="card stat"><div class="k">${esc(t('sum.total'))}</div><div class="v">${fmt(total)}<span class="u">${u}</span></div></div>
    <div class="card stat"><div class="k">${esc(t('sum.unique'))}</div><div class="v">${fmt(unique)}<span class="u">${u}</span></div></div>
    <div class="card stat"><div class="k">${esc(t('sum.cover'))}</div><div class="v">${pct(cover, total)}<span class="u">%</span></div></div>
    <div class="card stat warn"><div class="k">${esc(t('sum.over'))}</div><div class="v">${fmt(overOcc)}<span class="u">${esc(t('sum.overKinds', { n: fmt(over.length) }))}</span></div></div>`;

  // 分段字頻
  const bands = groupBands(items);
  const chev = '<svg class="chev" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
  $('bandList').innerHTML = bands.map(b => {
    const empty = b.kinds === 0;
    const width = Math.min(100, (b.occ / total * 100) / 60 * 100);
    const label = b.over ? `<span class="b" style="color:var(--accent-text)">${esc(b.label)}</span>` : `<span class="b">${esc(b.label)}</span>`;
    const panel = empty ? '' : `<div class="bpanel">
        <p class="s-sm muted" style="margin-bottom:16px">${esc(t('band.panelNote', { k: fmt(b.kinds), n: fmt(b.occ) }))}</p>
        <div class="chars">${b.items.map(cardHtml).join('')}</div></div>`;
    return `<details class="band${empty ? ' empty' : ''}"><summary class="brow">${chev}${label}
      <span class="ct">${esc(t('band.count', { n: fmt(b.occ) }))}</span><span class="pc">${pct(b.occ, total)}%</span>
      <span class="bar"><i class="${tierCls(b.tier)}" style="width:${width.toFixed(1)}%"></i></span></summary>${panel}</details>`;
  }).join('');

  // 字卡格
  $('charCards').innerHTML = items.map(cardHtml).join('');

  // 原文標色（超出使用者設定的上限者標紅）
  let html = '', buf = '';
  const flush = () => { if (buf) { html += `<span class="over">${esc(buf)}</span>`; buf = ''; } };
  for (const raw of a.text) {
    if (HAN.test(raw) && isOver(state.mdMap.get(norm(raw)), state.limit)) { buf += raw; continue; }
    flush();
    html += esc(raw);
  }
  flush();
  $('srcText').innerHTML = html;

  renderAdvanced(a, bands);
}

function cardHtml(i) {
  return `<div class="ch ${tierCls(tierOf(i.rank))}">${esc(i.ch)}<span class="n">${i.count}</span></div>`;
}

function renderAdvanced(a, bands) {
  // 完整區間統計（累積比等欄位）
  let cumT = 0, cumU = 0;
  const head = ['th.range', 'th.C', 'th.D', 'th.E', 'th.F', 'th.G', 'th.H', 'th.words']
    .map((k, i) => `<th${i > 0 && i < 7 ? ' class="num"' : ''}>${esc(t(k))}</th>`).join('');
  const rows = bands.filter(b => b.kinds > 0).map(b => {
    cumT += b.occ; cumU += b.kinds;
    return `<tr><td>${esc(b.over ? t('adv.over') : b.label)}</td><td class="num">${fmt(b.occ)}</td><td class="num">${fmt(b.kinds)}</td>
      <td class="num">${pct(b.occ, a.total)}%</td><td class="num">${pct(cumT, a.total)}%</td>
      <td class="num">${pct(b.kinds, a.unique)}%</td><td class="num">${pct(cumU, a.unique)}%</td>
      <td class="wl">${b.items.map(i => `${esc(i.ch)}(${i.count})`).join('、')}</td></tr>`;
  }).join('');
  $('advBandTable').innerHTML = `<thead><tr>${head}</tr></thead><tbody>${rows}</tbody>`;

  renderCharTable();

  // 台語推薦用字（詞）
  const tw = a.twHits;
  $('twWords').innerHTML = tw.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr>
      <th>${esc(t('th.word'))}</th><th>${esc(t('th.reading'))}</th><th>${esc(t('th.mandarin'))}</th><th class="num">${esc(t('th.count'))}</th></tr></thead><tbody>
      ${tw.map(w => `<tr><td>⭐ ${esc(w.word)}</td><td>${esc(w.reading)}</td><td>${esc(w.mandarin)}</td><td class="num">${w.count}</td></tr>`).join('')}
      </tbody></table></div>` : `<p class="muted">${esc(t('tw.none'))}</p>`;
}

function renderCharTable() {
  const a = state.analysis;
  if (!a) return;
  const { col, dir } = state.sort;
  const rows = [...a.items].sort((x, y) => {
    const vx = col === 'rank' ? (x.rank ?? 1e9) : x.count;
    const vy = col === 'rank' ? (y.rank ?? 1e9) : y.count;
    return (dir === 'asc' ? vx - vy : vy - vx) || x.ch.localeCompare(y.ch);
  });
  const arrow = c => col === c ? (dir === 'desc' ? '▼' : '▲') : '↕';
  $('advCharTable').innerHTML = `<thead><tr><th>${esc(t('th.char'))}</th>
    <th class="num"><button type="button" class="sortbtn" data-sort="count">${esc(t('th.count'))} ${arrow('count')}</button></th>
    <th class="num"><button type="button" class="sortbtn" data-sort="rank">${esc(t('th.rank'))} ${arrow('rank')}</button></th></tr></thead>
    <tbody>${rows.map(i => `<tr><td class="fd" style="font-size:20px">${esc(i.ch)}</td><td class="num">${i.count}</td><td class="num">${i.rank ?? '–'}</td></tr>`).join('')}</tbody>`;
}

async function runAnalysis() {
  await state.dbReady; // 字庫還沒載入完就先等待，避免全部被當成超出
  if (state.dbFailed) { toast(t('err.db')); return; }
  const text = $('inputText').value.trim();
  if (!text) { toast(t('input.empty')); return; }
  if (!countHan(text)) { toast(t('input.noHan')); return; }
  state.analysis = analyze(text);
  state.sort = { col: 'count', dir: 'desc' };
  renderResults();
  renderPrompt();
  setView('result');
}

/* ---------- 常用字上限（全站唯一欄位） ---------- */
function onLimitInput() {
  const el = $('freqLimit');
  const v = Number(el.value);
  const ok = el.value.trim() !== '' && Number.isInteger(v) && v >= 1 && v <= MAX_RANK;
  el.classList.toggle('err', !ok);
  const hint = $('limitHint');
  hint.classList.toggle('err', !ok);
  hint.textContent = ok ? t('limit.hint', { n: fmt(state.mdCount) }) : t('limit.err');
  if (!ok) return;
  state.limit = v;
  if (state.analysis) renderResults();
  renderPrompt();
}

/* ---------- 提示詞產生器 ---------- */
function buildPrompt() {
  const a = state.analysis;
  const lang = $('pLang').value;
  const len = $('pLen').value;
  const limit = state.limit;
  const overChars = a ? a.items.filter(i => isOver(i.rank, limit)).map(i => i.ch) : [];

  let lengthLine;
  if (len === 'none') lengthLine = '目標長度：與原文長度相近。';
  else if (a) lengthLine = `目標長度：約 ${Math.round(a.total * Number(len) / 100)} 字（原文的 ${len}%）。`;
  else lengthLine = `目標長度：約為原文長度的 ${len}%。`;

  const L = [];
  L.push('你是一位專業的語言教學助理與台語專家。');
  L.push('任務：把下方「原文」改寫成更簡單、適合初學者閱讀的版本。');
  L.push('');
  L.push('【改寫要求】');
  L.push(`1. 目標語言：${lang === 'tw' ? '台語（臺灣閩南語，以漢字書寫）' : '中語（華語）'}。`);
  L.push(`2. ${lengthLine}`);
  L.push(`3. 常用字上限：請盡量只使用中文字頻排名前 ${limit} 名的常用字。`);
  if (overChars.length) {
    L.push({ pre: '4. 以下字超出上限，請替換成較常用的字或詞：', over: overChars.join('、') });
  } else {
    L.push('4. 原文沒有超出上限的字，維持常用字即可。');
  }
  L.push('5. 詞彙盡量使用常用的基礎詞彙，句子要短，語意要清楚。');
  if (lang === 'tw') {
    L.push('');
    L.push('【台語規則（絕對核心）】');
    L.push('- 改寫後的版本必須 100% 使用台語，嚴格禁止把台語原文翻譯成中語（國語／普通話）。');
    L.push('- 輸出內容絕對不能出現標準中語的慣用詞彙或語法（例如「太陽」、「幫忙」），請改用台語詞彙（例如「日頭」、「鬥相共」）。');
    L.push('- 所有詞彙、虛詞、語句結構都必須符合真正的台語用法。');
  }
  L.push('');
  L.push('【輸出格式】');
  L.push('只輸出改寫後的正文。不要開場白、不要解釋、不要結語。');
  L.push('');
  L.push('【原文】');
  L.push(a ? a.text : '（請把原文貼在這裡）');

  const text = L.map(x => typeof x === 'string' ? x : x.pre + x.over).join('\n');
  const html = L.map(x => typeof x === 'string' ? esc(x) : esc(x.pre) + `<span class="over">${esc(x.over)}</span>`).join('\n');
  return { text, html };
}

function renderPrompt() {
  $('pLimit').textContent = state.limit;
  const len = $('pLen').value;
  const a = state.analysis;
  $('pLenHint').textContent = len === 'none' ? t('prompt.lenHintNone')
    : t('prompt.lenHint', { p: len }) + (a ? t('prompt.lenHintN', { n: fmt(Math.round(a.total * Number(len) / 100)) }) : '');
  $('promptPreview').innerHTML = buildPrompt().html;
}

async function copyPrompt() {
  const text = buildPrompt().text;
  let ok = false;
  try { await navigator.clipboard.writeText(text); ok = true; } catch (e) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      ok = document.execCommand('copy');
      ta.remove();
    } catch (e2) { ok = false; }
  }
  if (!ok) { toast(t('prompt.copyFail')); return; }
  const label = $('copyLabel');
  label.textContent = t('prompt.copied') + ' ✓';
  toast(t('prompt.copied'));
  setTimeout(() => { label.textContent = t('prompt.copy'); }, 2000);
}

/* ---------- Excel ---------- */
function exportExcel() {
  const a = state.analysis;
  if (!a) return;
  if (!window.XLSX) { toast('Excel 元件載入失敗，請重新整理頁面。'); return; }
  const bands = groupBands(a.items);
  const summary = [
    { [t('xl.item')]: t('xl.time'), [t('xl.value')]: new Date().toLocaleString() },
    { [t('xl.item')]: t('sum.total'), [t('xl.value')]: a.total },
    { [t('xl.item')]: t('sum.unique'), [t('xl.value')]: a.unique },
    { [t('xl.item')]: t('xl.limit'), [t('xl.value')]: state.limit },
  ];
  let cumT = 0, cumU = 0;
  const bandRows = bands.filter(b => b.kinds > 0).map(b => {
    cumT += b.occ; cumU += b.kinds;
    return {
      [t('th.range')]: b.over ? t('adv.over') : b.label,
      [t('th.C')]: b.occ, [t('th.D')]: b.kinds,
      [t('th.E') + ' %']: pct(b.occ, a.total), [t('th.F') + ' %']: pct(cumT, a.total),
      [t('th.G') + ' %']: pct(b.kinds, a.unique), [t('th.H') + ' %']: pct(cumU, a.unique),
      [t('th.words')]: b.items.map(i => `${i.ch}(${i.count})`).join(', '),
    };
  });
  const charRows = a.items.map(i => ({ [t('th.char')]: i.ch, [t('th.count')]: i.count, [t('th.rank')]: i.rank ?? 'N/A' }));
  const twRows = a.twHits.map(w => ({ [t('th.word')]: w.word, [t('th.reading')]: w.reading, [t('th.mandarin')]: w.mandarin, [t('th.count')]: w.count }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), t('xl.summary'));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(bandRows), t('xl.bands'));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(charRows), t('xl.chars'));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(twRows.length ? twRows : [{ [t('th.word')]: '' }]), t('xl.tw'));
  XLSX.writeFile(wb, `41研究室_文本分析報告_${Date.now()}.xlsx`);
}

/* ---------- 事件 ---------- */
function bind() {
  $('langMd').onclick = () => setLang('md');
  $('langTw').onclick = () => setLang('tw');
  $('themeLight').onclick = () => setTheme('light');
  $('themeDark').onclick = () => setTheme('dark');
  $('themeToggle').onclick = () => setTheme(state.theme === 'dark' ? 'light' : 'dark');

  TABS.forEach((n, idx) => {
    const btn = $(tabId(n));
    btn.onclick = () => setTab(n);
    btn.onkeydown = e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const next = TABS[(idx + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length];
        setTab(next, true);
      }
    };
  });

  $('inputText').addEventListener('input', updateCharCount);
  $('clearBtn').onclick = () => { $('inputText').value = ''; updateCharCount(); $('inputText').focus(); };
  $('analyzeBtn').onclick = runAnalysis;
  $('reanalyzeBtn').onclick = () => setView('input');
  $('excelBtn').onclick = exportExcel;
  $('freqLimit').addEventListener('input', onLimitInput);

  $('bandList').addEventListener('click', e => {
    const sm = e.target.closest('summary');
    if (sm && sm.parentElement.classList.contains('empty')) e.preventDefault();
  });
  $('advCharTable').addEventListener('click', e => {
    const b = e.target.closest('[data-sort]');
    if (!b) return;
    const col = b.dataset.sort;
    state.sort = { col, dir: state.sort.col === col && state.sort.dir === 'desc' ? 'asc' : 'desc' };
    renderCharTable();
  });

  $('pLang').onchange = renderPrompt;
  $('pLen').onchange = renderPrompt;
  $('copyBtn').onclick = copyPrompt;
  $('pLimitEdit').onclick = () => {
    setTab('analysis');
    $('freqLimit').focus();
    $('freqLimit').select();
  };
}

async function init() {
  bind();
  setTheme(load('theme') === 'dark' ? 'dark' : 'light'); // 預設淺色
  setLang(load('uiLang') === 'tw' ? 'tw' : 'md');
  setTab('analysis');
  setView('input');
  state.dbReady = loadDb();
  await Promise.all([state.dbReady, fetchVisits()]);
}

// 提供給 exam.js 使用
window.App = { t, toast, fmt, esc, getLang: () => state.lang, onLang: fn => langListeners.push(fn) };

init();
})();
