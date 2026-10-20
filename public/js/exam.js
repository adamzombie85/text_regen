/**
 * 自編識字量估計測驗
 * 所有施測資料只存在這個頁面的記憶體裡：不上傳、不寫入 localStorage。
 */
(() => {
'use strict';

const A = window.App;
const $ = id => document.getElementById(id);
const t = (k, v) => A.t(k, v);
const esc = A.esc;
const fmt = A.fmt;

const PAT_KEYS = ['f', 's', 'm', 'fs', 'fm', 'sm', 'fsm', 'u'];

const ex = {
  data: null,
  dataFailed: false,
  info: { date: '', student: '', tester: '' },
  records: [],          // 0..199：'up' | 'down' | null
  cur: 0,
  screenOpen: false,
  dirty: false,         // 開始施測後為 true，用來在離開頁面前提醒
  view: 'start',        // start | entry | result
  unrec: [],
  last: 0,
  wrongList: [],        // 已解析的錯題題號
  details: new Map(),   // 題號 -> { f, s, m, u, reading }
  result: null,
};

/* ---------- 工具 ---------- */
function formatList(arr, sep = ', ', dash = '-') {
  const a = [...new Set(arr)].sort((x, y) => x - y);
  const out = [];
  for (let i = 0; i < a.length;) {
    let j = i;
    while (j + 1 < a.length && a[j + 1] === a[j] + 1) j++;
    out.push(j > i ? `${a[i]}${dash}${a[j]}` : `${a[i]}`);
    i = j + 1;
  }
  return out.join(sep);
}

// 接受「3, 15, 22-25」，也容許全形逗號與連字號
function parseList(str, max) {
  const s = str.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .replace(/[，、；;\s]+/g, ',').replace(/[－–—~～]/g, '-').replace(/^,+|,+$/g, '');
  if (!s) return { ok: true, list: [] };
  const set = new Set();
  for (const part of s.split(',')) {
    if (!part) continue;
    const m = /^(\d+)(?:-(\d+))?$/.exec(part);
    if (!m) return { ok: false, error: 'ex.wrong.fmtErr' };
    const a = Number(m[1]), b = m[2] ? Number(m[2]) : a;
    if (a < 1 || b > max || a > b) return { ok: false, error: 'ex.wrong.rangeErr' };
    for (let q = a; q <= b; q++) set.add(q);
  }
  return { ok: true, list: [...set].sort((x, y) => x - y) };
}

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const detail = q => {
  if (!ex.details.has(q)) ex.details.set(q, { f: false, s: false, m: false, u: false, reading: '' });
  return ex.details.get(q);
};
const patOf = d => d.u ? 'u' : ((d.f ? 'f' : '') + (d.s ? 's' : '') + (d.m ? 'm' : '')) || null;
const patKey = d => patOf(d) || 'u'; // 沒選的以「不明錯誤」計

function showView(name) {
  ex.view = name;
  $('exStart').hidden = name !== 'start';
  $('exEntry').hidden = name !== 'entry';
  $('exResult').hidden = name !== 'result';
  window.scrollTo(0, 0);
}

/* ---------- 題目 ---------- */
async function loadData() {
  try {
    const res = await fetch('data/literacy-items.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    ex.data = await res.json();
  } catch (e) {
    console.error('題目載入失敗', e);
    ex.dataFailed = true;
  }
}
const dataReady = loadData();

/* ---------- 開始頁 ---------- */
async function startExam() {
  const date = $('exDate').value, student = $('exStudent').value.trim(), tester = $('exTester').value.trim();
  $('exDate').classList.toggle('err', !date);
  $('exStudent').classList.toggle('err', !student);
  $('exTester').classList.toggle('err', !tester);
  const missing = !date || !student || !tester;
  const err = $('exStartErr');
  err.hidden = !missing;
  err.textContent = missing ? t('ex.needAll') : '';
  if (missing) return;

  await dataReady;
  if (!ex.data) { A.toast(t('ex.dataErr')); return; }

  ex.info = { date, student, tester };
  ex.records = new Array(200).fill(null);
  ex.details = new Map();
  ex.result = null;
  ex.cur = 0;
  ex.dirty = true;
  openScreen();
}

/* ---------- 施測畫面 ---------- */
function openScreen() {
  $('exScreen').hidden = false;
  document.body.classList.add('ex-lock');
  ex.screenOpen = true;
  renderScreen();
  $('exStage').focus({ preventScroll: true });
}

function closeScreen() {
  $('exScreen').hidden = true;
  document.body.classList.remove('ex-lock');
  ex.screenOpen = false;
}

function renderScreen() {
  if (!ex.data) return;
  const it = ex.data.items[ex.cur];
  const rec = ex.records[ex.cur];
  // 記錄標記一律用中性樣式，不用紅綠色或 ✓／✗
  const mark = rec === 'up' ? '↑' : rec === 'down' ? '↓' : '—';
  $('exChar').textContent = it.char;
  $('exChar').setAttribute('aria-label', t('ex.aria.char', { c: it.char }));
  $('exNum').textContent = `${it.n}／200`;
  $('exNum').setAttribute('aria-label', t('ex.aria.q', { n: it.n }));
  $('exMark').textContent = mark;
  $('exMark').setAttribute('aria-label', t('ex.aria.mark', { m: mark }));
  $('exUp').setAttribute('aria-pressed', String(rec === 'up'));
  $('exDown').setAttribute('aria-pressed', String(rec === 'down'));
  $('exUp').setAttribute('aria-label', t('ex.aria.up'));
  $('exDown').setAttribute('aria-label', t('ex.aria.down'));
  $('exPrev').disabled = ex.cur === 0;
  $('exNext').disabled = ex.cur === 199;
}

function go(delta) {
  const n = ex.cur + delta;
  if (n < 0 || n > 199) return;
  ex.cur = n;
  renderScreen();
}

function record(v) {
  ex.records[ex.cur] = v; // 記錄後不自動跳下一題；回頭可直接改
  renderScreen();
}

function onKey(e) {
  if (!ex.screenOpen || $('exConfirm').open || e.isComposing) return;
  const k = e.key;
  if (k === 'ArrowLeft' || k === 'ArrowRight') {
    e.preventDefault();
    if (!e.repeat) go(k === 'ArrowRight' ? 1 : -1);
  } else if (k === 'ArrowUp') { e.preventDefault(); record('up'); }
  else if (k === 'ArrowDown') { e.preventDefault(); record('down'); }
}

/* ---------- 結束施測 ---------- */
function lastRecordedIndex() {
  for (let i = 199; i >= 0; i--) if (ex.records[i]) return i;
  return -1;
}

function finish() {
  const lastIdx = lastRecordedIndex();
  if (lastIdx < 0) { A.toast(t('ex.noRecord')); return; }
  const unrec = [];
  for (let i = 0; i <= lastIdx; i++) if (!ex.records[i]) unrec.push(i + 1);
  if (unrec.length) {
    ex.unrec = unrec;
    $('exConfirmBody').textContent = t('ex.confirm.unrec', { list: formatList(unrec, '、', '–') });
    $('exConfirm').showModal();
  } else {
    toEntry();
  }
}

function toEntry() {
  const lastIdx = lastRecordedIndex();
  closeScreen();
  const wrong = [];
  for (let i = 0; i <= lastIdx; i++) if (ex.records[i] !== 'up') wrong.push(i + 1); // 未記錄也算錯
  ex.last = lastIdx + 1;
  $('exLast').value = String(ex.last);
  $('exWrong').value = formatList(wrong);
  showView('entry');
  renderEntryMeta();
  validateEntry(true);
}

/* ---------- 錯題輸入 ---------- */
function renderEntryMeta() {
  const i = ex.info;
  $('exEntryMeta').innerHTML =
    `<div><span class="k">${esc(t('ex.student'))}</span><span class="v">${esc(i.student)}</span></div>
     <div><span class="k">${esc(t('ex.tester'))}</span><span class="v">${esc(i.tester)}</span></div>
     <div><span class="k">${esc(t('ex.date'))}</span><span class="v">${esc(i.date)}</span></div>`;
}

function validateEntry(forceRows) {
  const lv = $('exLast').value.trim();
  const ln = Number(lv);
  const lastOk = lv !== '' && Number.isInteger(ln) && ln >= 1 && ln <= 200;
  $('exLast').classList.toggle('err', !lastOk);
  const le = $('exLastErr');
  le.hidden = lastOk;
  le.textContent = lastOk ? '' : t('ex.last.err');
  if (lastOk) ex.last = ln;

  const parsed = parseList($('exWrong').value, lastOk ? ln : 200);
  $('exWrong').classList.toggle('err', !parsed.ok);
  const hint = $('exWrongHint');
  hint.classList.toggle('err', !parsed.ok);
  hint.textContent = parsed.ok ? t('ex.wrong.hint', { n: parsed.list.length }) : t('ex.wrong.fmtErr' === parsed.error ? 'ex.wrong.fmtErr' : parsed.error, { max: lastOk ? ln : 200 });

  const changed = parsed.ok && (forceRows || parsed.list.join() !== ex.wrongList.join());
  if (parsed.ok) ex.wrongList = parsed.list;
  if (changed) renderRows();
  $('exResultBtn').disabled = !(lastOk && parsed.ok);
}

function rowHtml(q) {
  const d = detail(q);
  const it = ex.data.items[q - 1];
  const pk = patOf(d);
  const pat = pk ? `<span class="pat" data-pat>${esc(t('pat.' + pk))}</span>` : `<span class="pat none" data-pat>${esc(t('pat.none'))}</span>`;
  const tg = (k) => `<button type="button" class="tg" data-k="${k}" aria-pressed="${d[k]}">${esc(t('ex.t.' + k))}</button>`;
  return `<div class="qc" data-q="${q}">
    <div class="hd"><span class="fd s-2">${esc(t('ex.q', { n: q }))}</span>${pat}</div>
    <div class="tgs">${tg('f')}${tg('s')}${tg('m')}${tg('u')}</div>
    <div class="two">
      <div><div class="label">${esc(t('ex.target'))}</div><div class="tdisp" role="img" aria-label="${esc(t('ex.q', { n: q }) + ' ' + t('ex.aria.char', { c: it.char }))}">${esc(it.char)}</div></div>
      <div><label class="label" for="exr${q}">${esc(t('ex.reading'))}<span class="opt">${esc(t('ex.optional'))}</span></label>
      <input id="exr${q}" class="input" type="text" autocomplete="off" value="${esc(d.reading)}" placeholder="${esc(t('ex.optional'))}"></div>
    </div></div>`;
}

function renderRows() {
  $('exRows').innerHTML = ex.wrongList.map(rowHtml).join('');
}

function onRowClick(e) {
  const b = e.target.closest('.tg');
  if (!b) return;
  const row = b.closest('.qc');
  const q = Number(row.dataset.q);
  const d = detail(q);
  const k = b.dataset.k;
  if (k === 'u') { d.u = !d.u; if (d.u) d.f = d.s = d.m = false; }
  else { d[k] = !d[k]; if (d[k]) d.u = false; }
  row.querySelectorAll('.tg').forEach(x => x.setAttribute('aria-pressed', String(d[x.dataset.k])));
  const pk = patOf(d);
  const pat = row.querySelector('[data-pat]');
  pat.classList.toggle('none', !pk);
  pat.textContent = pk ? t('pat.' + pk) : t('pat.none');
}

function onRowInput(e) {
  const inp = e.target.closest('input');
  if (!inp) return;
  detail(Number(inp.closest('.qc').dataset.q)).reading = inp.value;
}

/* ---------- 計算與結果 ---------- */
function computeResult() {
  const items = ex.data.items;
  const last = ex.last;
  const wrongSet = new Set(ex.wrongList);
  const levels = ex.data.levels.map(L => {
    const its = items.filter(i => i.level === L.level);
    const answered = its.filter(i => i.n <= last).length;
    const correct = its.filter(i => i.n <= last && !wrongSet.has(i.n)).length;
    return { ...L, total: its.length, answered, correct, rate: correct / its.length };
  });
  // 估計識字量 = Σ（各級答對率 × 該級字數），四捨五入到十位；最後作答題號之後與未記錄的題目都算錯
  const raw = levels.reduce((s, l) => s + l.rate * l.size, 0);
  const rows = ex.wrongList.map(q => {
    const d = detail(q);
    return { q, char: items[q - 1].char, reading: d.reading.trim(), pat: patKey(d) };
  });
  const counts = Object.fromEntries(PAT_KEYS.map(k => [k, 0]));
  rows.forEach(r => { counts[r.pat]++; });
  const dims = {
    form: rows.filter(r => r.pat.includes('f')).length,
    sound: rows.filter(r => r.pat.includes('s')).length,
    mean: rows.filter(r => r.pat.includes('m')).length,
  };
  return {
    est: Math.round(raw / 10) * 10, correct: levels.reduce((s, l) => s + l.correct, 0),
    last, wrongN: rows.length, levels, rows, counts, dims, info: { ...ex.info },
  };
}

const pctOf = (a, b) => b ? Math.round(a / b * 100) : 0;

function levelRowsHtml(r) {
  return r.levels.map(L => {
    const name = esc(t('ex.lv.name', { l: L.level, a: L.from, b: L.to }));
    if (L.answered === 0) {
      return `<div class="hb lvl z"><span class="nm">${name}</span><span class="tr"></span><span class="na">${esc(t('ex.lv.na'))}</span></div>`;
    }
    const p = Math.round(L.rate * 100);
    return `<div class="hb lvl"><span class="nm">${name}</span><span class="tr"><i class="fl" style="width:${(L.rate * 100).toFixed(1)}%"></i></span><span class="vl">${p}%</span></div>`;
  }).join('');
}

function levelNote(r) {
  const partial = r.levels.find(L => L.answered > 0 && L.answered < L.total);
  const unans = r.levels.some(L => L.answered === 0);
  return (partial ? t('ex.lv.partial', { l: partial.level, n: partial.answered }) : '') + (partial || unans ? t('ex.lv.unans') : '');
}

function patternRowsHtml(r) {
  return PAT_KEYS.map(k => {
    const c = r.counts[k];
    const p = pctOf(c, r.wrongN);
    return `<div class="hb pt"><span class="nm">${esc(t('pat.' + k))}</span><span class="tr"><i class="fl" style="width:${r.wrongN ? (c / r.wrongN * 100).toFixed(1) : 0}%"></i></span><span class="vl">${c}${r.wrongN ? `（${p}%）` : ''}</span></div>`;
  }).join('');
}

function wrongRowsHtml(rows) {
  return rows.map(w => `<tr><td class="q">${w.q}</td><td class="t">${esc(w.char)}</td>
    <td class="rd${w.reading ? '' : ' muted'}">${w.reading ? esc(w.reading) : '—'}</td><td><span class="pat">${esc(t('pat.' + w.pat))}</span></td></tr>`).join('');
}

function wrongTableHtml(rows) {
  return `<table class="ex-tbl"><thead><tr><th scope="col">${esc(t('ex.list.q'))}</th><th scope="col">${esc(t('ex.list.char'))}</th>
    <th scope="col">${esc(t('ex.list.reading'))}</th><th scope="col">${esc(t('ex.list.pat'))}</th></tr></thead><tbody>${wrongRowsHtml(rows)}</tbody></table>`;
}

function metaHtml(i, cls) {
  return `<div class="${cls}"><div><span class="k">${esc(t('ex.student'))}</span><span class="v">${esc(i.student)}</span></div>
    <div><span class="k">${esc(t('ex.tester'))}</span><span class="v">${esc(i.tester)}</span></div>
    <div><span class="k">${esc(t('ex.date'))}</span><span class="v">${esc(i.date)}</span></div></div>`;
}

function renderResult() {
  const r = ex.result;
  if (!r) return;
  const dim = (key, n) => `<div class="card stat rc"><div><div class="k">${esc(t(key))}</div><div class="v fd">${pctOf(n, r.wrongN)}<span class="u">%</span></div></div>
    <div><div class="prog"><i class="c" style="width:${r.wrongN ? (n / r.wrongN * 100).toFixed(1) : 0}%"></i></div><div class="s-sm muted" style="margin-top:6px">${esc(t('ex.res.of', { a: n, b: r.wrongN }))}</div></div></div>`;
  const note = levelNote(r);
  $('exResult').innerHTML = `
    <div class="ex-res-head"><h1 class="fd s-1">${esc(t('ex.title'))}</h1><span class="pat">${esc(t('ex.res.badge'))}</span></div>
    ${metaHtml(r.info, 'ex-res-meta')}
    <div class="ex-res-top">
      <section class="card card-lg ex-est"><h2 class="s-3 b">${esc(t('ex.res.est'))}</h2>
        <div class="fd ex-est-num"><span class="a">${esc(t('ex.res.about'))}</span><span class="n">${fmt(r.est)}</span><span class="u">${esc(t('ex.res.char'))}</span></div>
        <p class="s-sm muted">${esc(t('ex.res.estNote'))}</p></section>
      <section class="card card-lg ex-ok"><h2 class="s-sm b muted">${esc(t('ex.res.correct'))}</h2>
        <div class="fd ex-ok-num"><span>${r.correct}</span><span class="of">／ 200</span></div>
        <div class="prog" role="img" aria-label="${esc(t('ex.res.aria', { c: r.correct }))}"><i style="width:${(r.correct / 200 * 100).toFixed(1)}%"></i></div>
        <div class="ex-split"><span class="b">${esc(t('ex.res.last', { n: r.last }))}</span><span class="muted">${esc(t('ex.res.wrongN', { n: r.wrongN }))}</span></div></section>
    </div>
    <div class="notice ex-dl"><div class="l"><span class="ic" aria-hidden="true">!</span><span>${esc(t('ex.res.warn'))}</span></div>
      <button type="button" id="exDlBtn" class="btn btn-primary btn-lg"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 11l5 5 5-5M5 20h14"/></svg><span id="exDlLabel">${esc(t('ex.res.dl'))}</span></button></div>
    <section class="ex-dims"><h2 class="s-sm b muted">${esc(t('ex.res.dims', { n: r.wrongN }))}</h2>
      <div class="ex-dims-grid">${dim('ex.res.form', r.dims.form)}${dim('ex.res.sound', r.dims.sound)}${dim('ex.res.mean', r.dims.mean)}</div></section>
    <section class="card card-lg ex-sect"><div class="ex-sect-head"><h2 class="fd s-2">${esc(t('ex.lv.title'))}</h2><span class="s-sm muted">${esc(t('ex.lv.sub'))}</span></div>
      <div class="ex-bars">${levelRowsHtml(r)}</div>${note ? `<p class="s-sm muted" style="margin-top:16px">${esc(note)}</p>` : ''}</section>
    <section class="card card-lg ex-sect"><div class="ex-sect-head"><h2 class="fd s-2">${esc(t('ex.pt.title'))}</h2><span class="s-sm muted">${esc(t('ex.pt.sub'))}</span></div>
      <div class="ex-bars">${patternRowsHtml(r)}</div></section>
    <section class="card card-lg ex-sect"><div class="ex-sect-head"><h2 class="fd s-2">${esc(t('ex.list.title'))}</h2><span class="s-sm muted">${esc(t('ex.list.sub', { n: r.wrongN }))}</span></div>
      ${r.wrongN ? `<div style="overflow-x:auto">${wrongTableHtml(r.rows)}</div>` : `<p class="muted">${esc(t('ex.res.noWrong'))}</p>`}</section>
    <p class="s-sm muted ex-foot-note">${esc(t('ex.res.afterLast'))}</p>`;
  $('exDlBtn').onclick = downloadPdf;
}

function showResult() {
  validateEntry(false);
  if ($('exResultBtn').disabled) return;
  ex.result = computeResult();
  renderResult();
  showView('result');
}

/* ---------- 結果 PDF（在頁面外繪製後輸出，不依賴列印視窗） ---------- */
function pdfPageHtml(inner, p, n) {
  return `<div class="pdf-page theme">${inner}<div class="pdf-foot"><span>${esc(t('ex.pdf.foot'))}</span><span>${esc(t('ex.pdf.page', { p, n }))}</span></div></div>`;
}

function buildPdfPages(r) {
  const head = `<div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px"><h1 class="fd" style="font-size:26px">${esc(t('ex.pdf.title'))}</h1></div>`;
  const dim = (key, n) => `<div><div class="s-sm b muted">${esc(t(key))}</div><div class="fd" style="font-size:30px;line-height:1.2">${pctOf(n, r.wrongN)}<span class="s-sm muted"> %　${esc(t('ex.res.of', { a: n, b: r.wrongN }))}</span></div></div>`;
  const p1 = `${head}${metaHtml(r.info, 'ex-res-meta')}
    <div class="pdf-top">
      <div class="pdf-est"><div class="s-3 b">${esc(t('ex.res.est'))}</div>
        <div class="fd" style="display:flex;align-items:baseline;gap:8px"><span style="font-size:24px">${esc(t('ex.res.about'))}</span><span class="n">${fmt(r.est)}</span><span style="font-size:26px">${esc(t('ex.res.char'))}</span></div>
        <div class="s-sm muted">${esc(t('ex.res.estNote'))}</div></div>
      <div class="pdf-ok"><div class="s-sm b muted">${esc(t('ex.res.correct'))}</div>
        <div class="fd" style="font-size:44px;line-height:1.1">${r.correct}<span class="muted" style="font-size:22px"> ／ 200</span></div>
        <div class="prog"><i style="width:${(r.correct / 200 * 100).toFixed(1)}%"></i></div>
        <div style="display:flex;justify-content:space-between;font-size:13px"><b>${esc(t('ex.res.last', { n: r.last }))}</b><span class="muted">${esc(t('ex.res.wrongN', { n: r.wrongN }))}</span></div></div>
    </div>
    <div class="pdf-sec"><h2 class="fd">${esc(t('ex.res.dims', { n: r.wrongN }))}</h2>
      <div class="pdf-dims">${dim('ex.res.form', r.dims.form)}${dim('ex.res.sound', r.dims.sound)}${dim('ex.res.mean', r.dims.mean)}</div></div>
    <div class="pdf-sec"><h2 class="fd">${esc(t('ex.lv.title'))}</h2><div style="display:grid;gap:9px">${levelRowsHtml(r)}</div>
      ${levelNote(r) ? `<p class="s-sm muted" style="margin:10px 0 0">${esc(levelNote(r))}</p>` : ''}</div>`;

  const patBlock = `<div class="pdf-sec" style="margin-top:0"><h2 class="fd">${esc(t('ex.pt.title'))}</h2><div style="display:grid;gap:9px">${patternRowsHtml(r)}</div></div>`;
  const titleSmall = `<div class="fd" style="font-size:18px;margin-bottom:14px">${esc(t('ex.pdf.title'))}　<span class="s-sm muted">${esc(r.info.student)}　${esc(r.info.date)}</span></div>`;
  const listHead = `<div class="pdf-sec"><h2 class="fd">${esc(t('ex.list.title'))}　<span class="s-sm muted">${esc(t('ex.list.sub', { n: r.wrongN }))}</span></h2>`;

  const FIRST = 15, REST = 26;
  const chunks = [r.rows.slice(0, FIRST)];
  for (let i = FIRST; i < r.rows.length; i += REST) chunks.push(r.rows.slice(i, i + REST));
  const bodies = [p1];
  bodies.push(`${titleSmall}${patBlock}${r.wrongN ? `${listHead}${wrongTableHtml(chunks[0])}</div>` : `<p class="muted" style="margin-top:18px">${esc(t('ex.res.noWrong'))}</p>`}`);
  for (let i = 1; i < chunks.length; i++) bodies.push(`${titleSmall}${listHead}${wrongTableHtml(chunks[i])}</div>`);
  const n = bodies.length;
  return bodies.map((b, i) => pdfPageHtml(b, i + 1, n));
}

async function downloadPdf() {
  const r = ex.result;
  if (!r) return;
  if (!window.html2canvas || !window.jspdf) { A.toast(t('ex.res.dlFail')); return; }
  const btn = $('exDlBtn'), label = $('exDlLabel');
  btn.disabled = true;
  label.textContent = t('ex.res.dling');
  const stage = $('pdfStage');
  try {
    stage.innerHTML = buildPdfPages(r).join('');
    const sample = stage.textContent;
    try {
      await Promise.all([document.fonts.load("22px Iansui", sample), document.fonts.load("700 16px 'Noto Sans TC'", sample), document.fonts.load("400 16px 'Noto Sans TC'", sample)]);
      await document.fonts.ready;
    } catch (e) { /* 字型載入失敗就用備用字型 */ }
    await new Promise(res => setTimeout(res, 200));
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const W = pdf.internal.pageSize.getWidth(), H = pdf.internal.pageSize.getHeight();
    const pages = [...stage.querySelectorAll('.pdf-page')];
    for (let i = 0; i < pages.length; i++) {
      const canvas = await window.html2canvas(pages[i], {
        scale: 2, backgroundColor: '#ffffff', useCORS: true,
        windowWidth: 1280, windowHeight: 1600, // 固定用桌機寬度排版，不受手機窄螢幕的 media query 影響
        onclone: doc => { const s = doc.getElementById('pdfStage'); if (s) { s.style.left = '0'; s.style.top = '0'; } },
      });
      if (i > 0) pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, W, H);
    }
    const safe = s => s.replace(/[\\/:*?"<>|\s]+/g, '');
    pdf.save(`識字量測驗結果_${safe(r.info.student)}_${r.info.date}.pdf`);
  } catch (e) {
    console.error('PDF 製作失敗', e);
    A.toast(t('ex.res.dlFail'));
  } finally {
    stage.innerHTML = '';
    btn.disabled = false;
    label.textContent = t('ex.res.dl');
  }
}

/* ---------- 列印：A4 施測記錄表（固定用中語） ---------- */
function sheetCells(from, to) {
  return ex.data.items.filter(i => i.n >= from && i.n <= to).map(i => `<div class="pp-cell">
    <div class="r1"><span class="n">${i.n}</span><span class="c">${esc(i.char)}</span><span class="ln"></span></div>
    <div class="r2"><span>形<i></i></span><span>音<i></i></span><span>義<i></i></span><span>？<i></i></span></div></div>`).join('');
}

function buildSheet() {
  const title = '自編識字量估計測驗　紙本施測記錄表';
  const p1 = `<div class="pp">
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px"><h1 class="pp-title" style="font-size:26px;line-height:1.3">${title}</h1><span style="font-size:12px;white-space:nowrap">第 1 頁／共 3 頁</span></div>
    <div style="display:flex;gap:24px;margin-top:14px">
      <div class="pp-fld"><b>測驗日期</b><span>年　　月　　日</span></div>
      <div class="pp-fld"><b>學生姓名</b><span></span></div>
      <div class="pp-fld"><b>施測者姓名</b><span></span></div></div>
    <div style="margin-top:12px;border:2px solid #000;padding:8px 12px;font-size:14px;line-height:1.6"><b>提醒</b>　學生連續答錯 5 題以上時，請觀察學生狀況，由施測者自行決定是否停止施測。</div>
    <div style="margin:10px 0 14px;border:1px solid #000;padding:8px 12px;font-size:13px;line-height:1.7"><b>操作說明</b><br>
      網站操作：← → 翻頁；↑ 正確、↓ 錯誤；要修改時，按 ← 回到該題，再按 ↑ 或 ↓。<br>
      對錯在網站上記錄；紙本只寫錯題的學生念法，組型可以等施測結束後再勾。<br>
      <span style="font-size:12px">形＝字形　音＝字音　義＝字義　？＝不明</span></div>
    <div class="pp-cells">${sheetCells(1, 56)}</div></div>`;
  const later = (p, a, b) => `<div class="pp">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px;margin-bottom:12px">
      <b class="pp-title" style="font-size:20px;line-height:1.3">${title}</b>
      <span style="display:flex;align-items:flex-end;gap:8px;font-size:12px;white-space:nowrap">學生姓名<span style="display:inline-block;width:130px;border-bottom:1px solid #000;height:18px"></span>　第 ${p} 頁／共 3 頁</span></div>
    <div class="pp-cells">${sheetCells(a, b)}</div></div>`;
  return p1 + later(2, 57, 128) + later(3, 129, 200);
}

async function printSheet() {
  await dataReady;
  if (!ex.data) { A.toast(t('ex.dataErr')); return; }
  const sheet = $('printSheet');
  sheet.innerHTML = buildSheet();
  try {
    await document.fonts.load("24px Iansui", sheet.textContent);
    await document.fonts.ready;
  } catch (e) { /* 用備用字型 */ }
  const cleanup = () => {
    document.body.classList.remove('print-sheet');
    sheet.innerHTML = '';
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  document.body.classList.add('print-sheet');
  window.print();
}

/* ---------- 語言切換時更新動態內容 ---------- */
function rerender() {
  if (ex.screenOpen) renderScreen();
  if (ex.view === 'entry') { renderEntryMeta(); renderRows(); validateEntry(false); }
  if (ex.view === 'result' && ex.result) renderResult();
}

/* ---------- 綁定 ---------- */
function bind() {
  $('exDate').value = today();
  $('exStartBtn').onclick = startExam;
  $('exPrintBtn').onclick = printSheet;
  ['exDate', 'exStudent', 'exTester'].forEach(id => $(id).addEventListener('input', () => {
    $(id).classList.remove('err');
    if ($('exDate').value && $('exStudent').value.trim() && $('exTester').value.trim()) $('exStartErr').hidden = true;
  }));

  $('exStage').tabIndex = -1;
  $('exStage').onclick = () => go(1);
  $('exNext').onclick = () => go(1);
  $('exPrev').onclick = () => go(-1);
  $('exUp').onclick = () => record('up');
  $('exDown').onclick = () => record('down');
  $('exEndBtn').onclick = finish;
  document.addEventListener('keydown', onKey);

  $('exConfirmBack').onclick = () => {
    $('exConfirm').close();
    if (ex.unrec.length) { ex.cur = ex.unrec[0] - 1; renderScreen(); }
  };
  $('exConfirmEnd').onclick = () => { $('exConfirm').close(); toEntry(); };

  $('exLast').addEventListener('input', () => validateEntry(false));
  $('exWrong').addEventListener('input', () => validateEntry(false));
  $('exRows').addEventListener('click', onRowClick);
  $('exRows').addEventListener('input', onRowInput);
  $('exBackBtn').onclick = () => { showView('start'); $('exStart').hidden = true; openScreen(); };
  $('exResultBtn').onclick = showResult;

  A.onLang(rerender);

  // 施測資料只存在記憶體；離開或重新整理前提醒
  window.addEventListener('beforeunload', e => {
    if (!ex.dirty) return;
    e.preventDefault();
    e.returnValue = '';
  });
}

bind();
})();
