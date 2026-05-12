import { verifyAuth } from "../lib/auth.js";

export async function onRequest(context) {
  const { request, env } = context;

  if (!verifyAuth(request, env)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const metrics = {};
    let cursor = null;

    // KV list is paginated, iterate all keys
    do {
      const listResult = await env.CLICKS.list({ cursor });
      for (const key of listResult.keys) {
        const value = await env.CLICKS.get(key.name);
        metrics[key.name] = parseInt(value, 10) || 0;
      }
      cursor = listResult.list_complete ? null : listResult.cursor;
    } while (cursor);

    return Response.json(metrics);
  } catch (e) {
    console.error("Failed to read metrics:", e);
    return Response.json({ error: "Failed to read metrics" }, { status: 500 });
  }
}
