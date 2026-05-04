export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. 處理 API: 獲取配額
    if (url.pathname === "/api/quota") {
      let remaining = await env.KV.get("remaining_quota") || 100;
      return new Response(JSON.stringify({ remaining: parseInt(remaining), total: 100 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // 新增：偵錯用 - 列出所有可用模型
    if (url.pathname === "/api/list_models") {
        const apiKey = (env.GEMINI_API_KEY || "").trim();
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await res.json();
        return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
    }

    // 2. 處理 API: 獲取統計數據 (使用 KV 進行持久化)
    if (url.pathname === "/api/stats") {
      let visitors = await env.KV.get("total_visitors") || 0;
      let historyJson = await env.KV.get("analysis_history") || "[]";
      
      // 每次進入統計頁面，人數 +1
      visitors = parseInt(visitors) + 1;
      await env.KV.put("total_visitors", visitors.toString());

      return new Response(JSON.stringify({ 
        visitors: visitors, 
        history: JSON.parse(historyJson) 
      }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // 3. 處理 API: 記錄分析紀錄
    if (url.pathname === "/api/log_analysis" && request.method === "POST") {
        const { preview, count } = await request.json();
        let history = JSON.parse(await env.KV.get("analysis_history") || "[]");
        history.unshift({ time: new Date().toLocaleString(), preview: preview.substring(0, 20) + "...", count });
        await env.KV.put("analysis_history", JSON.stringify(history.slice(0, 10)));
        return new Response(JSON.stringify({ success: true }));
    }

    // 4. 處理 API: AI 文本生成
    if (url.pathname === "/api/generate" && request.method === "POST") {
      const { text, lang, freq_limit, word_count } = await request.json();
      const apiKey = (env.GEMINI_API_KEY || "").trim();

      if (!apiKey) {
        return new Response(JSON.stringify({ text: "錯誤：找不到 API 金鑰，請在 Cloudflare 設定 Variables and Secrets。" }), { status: 500 });
      }

      const prompt = `你是一個專業的台語教材改寫專家。
請將以下文章改寫為 [${lang}]。
要求：
1. 目標字數約為 ${word_count} 字。
2. 盡量使用中語 5021 字頻排名在前 ${freq_limit} 名的常用字。
3. 語氣要自然、道地。

原文：
${text}`;

      const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-latest:generateContent?key=${apiKey}`;

      try {
        const response = await fetch(targetUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        });

        const data = await response.json();
        
        if (!response.ok) {
            return new Response(JSON.stringify({ text: `Google AI 報錯 (URL: ${targetUrl.substring(0, 60)}...)：${JSON.stringify(data)}` }), { status: 500 });
        }

        if (!data.candidates || !data.candidates[0]) {
            return new Response(JSON.stringify({ text: `AI 沒有產生結果。完整回應：${JSON.stringify(data)}` }), { status: 500 });
        }

        const generatedText = data.candidates[0].content.parts[0].text;
        
        // 扣除配額
        let remaining = parseInt(await env.KV.get("remaining_quota") || 100) - 1;
        await env.KV.put("remaining_quota", remaining.toString());

        return new Response(JSON.stringify({ text: generatedText }));
      } catch (error) {
        return new Response(JSON.stringify({ text: `執行發生錯誤：${error.message}` }), { status: 500 });
      }
    }

    // 5. 靜態檔案路由
    return env.ASSETS.fetch(request);
  }
};
