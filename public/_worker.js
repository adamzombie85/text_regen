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
      try {
        const body = await request.json();
        const { text, lang, freq_limit, word_count, user_api_key, model } = body;
        const requestedModel = model || "gemini-3.1-flash-lite";
        
        const clientIp = request.headers.get("CF-Connecting-IP") || "unknown";
        const lockKey = `active_gen:${clientIp}`;

        // 1. 檢查是否有正在進行的任務
        const isLocked = await env.KV.get(lockKey);
        if (isLocked) {
          return new Response(JSON.stringify({ 
            text: "BUSY", 
            error: "您目前已有一個生成任務正在進行中，請稍候再試。" 
          }), { status: 429 });
        }

        // 2. 設定鎖定
        await env.KV.put(lockKey, "true", { expirationTtl: 300 });

        let apiKey = (user_api_key || "").trim();

        // 3. 強制檢查個人金鑰
        if (!apiKey) {
            await env.KV.delete(lockKey); // 釋放鎖
            return new Response(JSON.stringify({ 
                text: "API_KEY_REQUIRED", 
                error: "本系統目前僅支援使用個人 API Key，請先填入金鑰。" 
            }), { status: 401 });
        }

        const langName = lang === 'tw' ? "台語 (Taiwanese/Tâi-gí)" : "中語 (Mandarin/Huan-gí)";
        const prompt = `你是一位專業的語言教學助理與台語專家。
任務：將給定的文章「改寫」成更簡單、適合初學者的版本。

【絕對核心規則：禁止跨語言翻譯】
1. **如果目標語言是台語，改寫後的版本也「必須 100% 使用台語」**。
2. **嚴格禁止將台語原文翻譯成中語（國語/普通話）**。
3. 輸出內容中「絕對不能」出現任何標準中語的慣用詞彙或語法（例如「太陽」、「幫忙」）。
4. 所有的詞彙、虛詞、語句結構都必須符合真正的「台語用法」（例如「日頭」、「鬥相共」）。

【改寫要求】
- 目標語言：${langName}。
- 目標長度：約 ${word_count} 字。
- 詞彙控制：盡量使用常用的基礎詞彙。

【格式要求】
- 僅輸出改寫後的正文。
- **禁止** 任何開場白、**禁止** 解釋、**禁止** 結語。

原文內容：
${text}`;

        const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/${requestedModel}:generateContent?key=${apiKey}`;

        const response = await fetch(targetUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        });

        const data = await response.json();
        
        if (!response.ok) {
            const errMsg = data.error ? data.error.message : JSON.stringify(data);
            return new Response(JSON.stringify({ 
                text: `Google AI 報錯 (404/400)：${errMsg}\n\n[診斷資訊]\n呼叫網址: models/${requestedModel}\nAPI 版本: v1beta` 
            }), { status: 500 });
        }

        if (!data.candidates || !data.candidates[0]) {
            await env.KV.delete(lockKey);
            return new Response(JSON.stringify({ text: `AI 沒有產生結果。` }), { status: 500 });
        }

        const generatedText = data.candidates[0].content.parts[0].text;
        
        // 任務完成，釋放鎖
        await env.KV.delete(lockKey);
        return new Response(JSON.stringify({ text: generatedText }));

      } catch (error) {
        if (typeof env !== 'undefined' && env.KV) {
            const clientIp = request.headers.get("CF-Connecting-IP") || "unknown";
            await env.KV.delete(`active_gen:${clientIp}`);
        }
        return new Response(JSON.stringify({ text: `執行發生錯誤：${error.message}` }), { status: 500 });
      }
    }

    // 5. 靜態檔案路由
    return env.ASSETS.fetch(request);
  }
};
