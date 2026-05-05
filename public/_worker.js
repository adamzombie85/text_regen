export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 新增：偵錯用 - 列出所有可用模型 (需帶入自己的 key)
    if (url.pathname === "/api/list_models") {
        const apiKey = (url.searchParams.get("key") || "").trim();
        if (!apiKey) return new Response("請提供 API Key (?key=YOUR_KEY)", { status: 401 });
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

    // 4. 處理 API: 查詢剩餘免費配額
    if (url.pathname === "/api/quota" && request.method === "GET") {
        const clientIp = request.headers.get("CF-Connecting-IP") || "unknown";
        const today = new Date().toISOString().split('T')[0];
        const ipKey = `ip_usage:${today}:${clientIp}`;
        const usage = parseInt(await env.KV.get(ipKey) || "0");
        const remaining = Math.max(0, 3 - usage);
        return new Response(JSON.stringify({ remaining }), {
            headers: { "Content-Type": "application/json" }
        });
    }

    // 5. 處理 API: AI 文本生成
    if (url.pathname === "/api/generate" && request.method === "POST") {
      const { text, lang, freq_limit, word_count, user_api_key } = await request.json();
      const clientIp = request.headers.get("CF-Connecting-IP") || "unknown";
      const today = new Date().toISOString().split('T')[0];
      const ipKey = `ip_usage:${today}:${clientIp}`;
      const lockKey = `active_gen:${clientIp}`;

      // 1. 檢查是否有正在進行的任務 (併發控制)
      const isLocked = await env.KV.get(lockKey);
      if (isLocked) {
        return new Response(JSON.stringify({ 
          text: "BUSY", 
          error: "您目前已有一個生成任務正在進行中，請稍候再試。" 
        }), { status: 429 });
      }

      // 2. 設定鎖定 (有效期 5 分鐘，避免異常鎖死)
      await env.KV.put(lockKey, "true", { expirationTtl: 300 });

      try {
        let apiKey = (user_api_key || "").trim();
        let isUsingSystemKey = false;

        // 3. 檢查 IP 額度
        if (!apiKey) {
            let usage = parseInt(await env.KV.get(ipKey) || "0");
            if (usage >= 3) {
                await env.KV.delete(lockKey); // 釋放鎖
                return new Response(JSON.stringify({ 
                    text: "FREE_QUOTA_EXCEEDED", 
                    error: "您今日的 3 次免金鑰額度已用完，請填入您個人的 API Key 繼續使用。" 
                }), { status: 403 });
            }
            apiKey = (env.GEMINI_API_KEY || "").trim();
            isUsingSystemKey = true;
            if (!apiKey) {
                await env.KV.delete(lockKey); // 釋放鎖
                return new Response(JSON.stringify({ text: "錯誤：系統金鑰未設定。" }), { status: 500 });
            }
        }

        const prompt = `你是一個專業的台語教材改寫專家。
請將以下文章改寫為 [${lang}]。
要求：
1. 目標字數約為 ${word_count} 字。
2. 盡量使用中語 5021 字頻排名在前 ${freq_limit} 名的常用字。
3. 語氣要自然、道地。
4. **絕對禁止輸出任何前言或結語**（例如：這是一份改寫好的文本...）。
5. **直接輸出改寫後的正文內容**。

原文：
${text}`;

        const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;

        const response = await fetch(targetUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        });

        const data = await response.json();
        
        if (!response.ok) {
            await env.KV.delete(lockKey);
            return new Response(JSON.stringify({ text: `Google AI 報錯：${JSON.stringify(data)}` }), { status: 500 });
        }

        if (!data.candidates || !data.candidates[0]) {
            await env.KV.delete(lockKey);
            return new Response(JSON.stringify({ text: `AI 沒有產生結果。` }), { status: 500 });
        }

        const generatedText = data.candidates[0].content.parts[0].text;
        
        if (isUsingSystemKey) {
            let usage = parseInt(await env.KV.get(ipKey) || "0") + 1;
            await env.KV.put(ipKey, usage.toString(), { expirationTtl: 86400 });
        }

        // 任務完成，釋放鎖
        await env.KV.delete(lockKey);
        return new Response(JSON.stringify({ text: generatedText }));

      } catch (error) {
        await env.KV.delete(lockKey); // 發生錯誤也要釋放鎖
        return new Response(JSON.stringify({ text: `執行發生錯誤：${error.message}` }), { status: 500 });
      }
    }

    // 5. 靜態檔案路由
    return env.ASSETS.fetch(request);
  }
};
