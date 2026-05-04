/**
 * 41 研究室 - Cloudflare Pages Worker
 * 代替 Python app.py 處理 AI 生成與 API 請求
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. 處理 API: 獲取配額 (Cloudflare 環境下暫時設為固定值，或搭配 KV 使用)
    if (url.pathname === "/api/quota") {
      return new Response(JSON.stringify({ remaining: 99, total: 100 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. 處理 API: 獲取統計數據
    if (url.pathname === "/api/stats") {
      return new Response(JSON.stringify({ 
        visitors: 1258, 
        history: [{ time: "2026-05-04", preview: "41 研究室文本分析測試...", count: 450 }] 
      }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // 3. 處理 API: AI 生成 (核心功能)
    if (url.pathname === "/api/generate" && request.method === "POST") {
      const { text, lang, freq_limit, word_count } = await request.json();
      const apiKey = env.GEMINI_API_KEY;

      if (!apiKey) {
        return new Response(JSON.stringify({ error: "請在 Cloudflare 設定 GEMINI_API_KEY 變數" }), { status: 500 });
      }

      const langName = lang === 'tw' ? "台語 (Taiwanese)" : "中語 (Mandarin)";
      const systemPrompt = `你是一位專業的語文教學助理。將給定文章改寫成更簡單的版本。
規則：
1. **絕對禁止跨語言翻譯**：目標是 ${langName}，請完全使用 ${langName}。
2. **難度門檻**：漢字難度不得超過『中語字頻前 ${freq_limit} 名』。
3. **長度**：約 ${word_count} 字。
4. **格式**：只輸出改寫後的文本。`;

      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `系統提示：${systemPrompt}\n\n原文：${text}` }] }]
          })
        });

        const data = await response.json();
        const generatedText = data.candidates[0].content.parts[0].text;

        return new Response(JSON.stringify({ text: generatedText, remaining: "充足" }), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: "AI 生成失敗" }), { status: 500 });
      }
    }

    // 4. 處理 API: 紀錄分析 (Cloudflare 環境下暫時空回傳)
    if (url.pathname === "/api/log_analysis") {
      return new Response(JSON.stringify({ status: "ok" }));
    }

    // 5. 預設：交給 Cloudflare Pages 處理靜態檔案
    return env.ASSETS.fetch(request);
  },
};
