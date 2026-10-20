// 只負責造訪人次計數；其餘請求交給靜態檔案。
// KV 綁定名稱為 KV（對應命名空間 TEXT_REGEN_DB）。
const COUNT_KEY = "total_visitors";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/visits") {
      const kv = env.KV || env.TEXT_REGEN_DB;
      if (!kv) {
        return Response.json({ error: "KV binding missing" }, { status: 500 });
      }
      let visitors = parseInt(await kv.get(COUNT_KEY)) || 0;
      if (request.method === "POST") {
        visitors += 1;
        await kv.put(COUNT_KEY, String(visitors));
      } else if (request.method !== "GET") {
        return new Response("Method Not Allowed", { status: 405 });
      }
      return Response.json({ visitors }, { headers: { "Cache-Control": "no-store" } });
    }

    return env.ASSETS.fetch(request);
  }
};
