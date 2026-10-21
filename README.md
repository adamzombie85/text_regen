# 41 研究室 - 文本分析助手 (Text Regen)

![License](https://img.shields.io/badge/license-MIT-green)

為台語教學設計的純前端工具：分析文本字頻、對照中語 5021 常用字，並協助老師調整教材的閱讀難度。

線上網址：https://text-regen.pages.dev/

## 功能

- **文本字頻分析**：統計字頻，對照中語字頻排名，標示超出常用字上限的字；可匯出 Excel。
- **文本簡化提示詞產生器**：依分析結果產生可貼到 ChatGPT／Gemini／Claude 的改寫提示詞。
- **自編識字量估計測驗**：內建 200 題自編題目（`public/data/literacy-items.json`），可列印 A4 施測記錄表、下載結果 PDF；估計值僅供教學參考，施測資料不上傳也不保存。
- 造訪人次計數（同一瀏覽器分頁工作階段只計 1 次）。

> 改版進度與規格見 `revamp` 分支。

## 技術架構

- 純靜態前端（HTML、CSS、Vanilla JS），部署於 Cloudflare Pages。
- `public/_worker.js`：只負責造訪人次計數（`/api/visits`），使用 KV 綁定 `KV`（命名空間 `TEXT_REGEN_DB`）。
- 字型：芫荽體 (Iansui)、Noto Sans TC。

## 專案結構

```
public/
  index.html
  style.css
  js/main.js
  data/word_db.json           字頻資料
  data/literacy-items.json    識字量測驗題目（v3）
  images/                     芒果 logo、favicon
  _worker.js          造訪人次計數
台語推薦用字700.csv    台語推薦用字來源資料
```

## 本機預覽

```bash
npx wrangler pages dev public --kv KV
```

## 授權

MIT License。

**© 2026 41 研究室 | 版權所有**
