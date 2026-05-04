# 41 研究室 - 文本分析助手 (Text Regen)

![License](https://img.shields.io/badge/license-MIT-green)
![Python](https://img.shields.io/badge/python-3.8+-blue)

這是一款專為台語教學設計的「雙軸識字分析與 AI 改寫工具」。旨在協助老師針對不同識字程度的學生，精確調整教材的閱讀難度，並確保台語漢字書寫的規範性。

## 🌟 核心理念

### 1. 識字難度控制 (中語 5021 基準)
不同於傳統的難易度區分，本工具採用 **中語 5021 常用字頻表** 作為學生的「識字量門檻」。老師可以設定上限（例如：前 500 字），AI 在改寫時便會避開超出該範圍的漢字，確保教材與學生的華語閱讀能力接軌。

### 2. 用字規範性 (台語 700 推薦字)
系統優先採用 **教育部 700 個台語推薦用字**，確保改寫後的文本具備規範且道地的台語書寫風格，並在分析報表中自動標註（⭐）屬於推薦用字的詞彙。

## 🚀 主要功能

- **文本字頻分析**：即時統計文本中的字頻分佈，並對照中語字頻排名。
- **AI 智慧改寫**：支援「中語 -> 中語」、「中語 -> 台語」等多種改寫模式，自動優化語法與用詞。
- **輾轉進度系統**：視覺化的腳踏車進度條，象徵文章改寫得愈來愈「輾轉 (Fluent)」。
- **數據統計專區**：追蹤造訪流量與分析動態，掌握教學應用軌跡。

## 🛠 技術架構

- **Backend**: Python (Flask)
- **AI Engine**: Google Gemini API (Flash/Pro)
- **Frontend**: HTML5, Vanilla CSS, Vanilla JS
- **Typography**: 芫荽體 (Iansui Font)

## 📦 安裝與執行

1. 克隆專案：
   ```bash
   git clone https://github.com/adamzombie85/text_regen.git
   ```
2. 安裝依賴：
   ```bash
   pip install -r requirements.txt
   ```
3. 設定 API Key：
   在根目錄建立 `api_key.txt` 並貼入您的 Gemini API Key。
4. 啟動伺服器：
   ```bash
   python app.py
   ```

## 📄 授權協議
本專案採用 **MIT License** 授權。歡迎教學社群自由推廣、二次開發。

---
**© 2026 41 研究室 | 版權所有**
