import { verifyAuth } from "../lib/auth.js";

export async function onRequest(context) {
  const { request, env } = context;

  if (!verifyAuth(request, env)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const filterId = url.searchParams.get("id");

    if (filterId) {
      const events = await env.EVENTS.get(filterId, { type: "json" });
      return Response.json({ [filterId]: events || [] });
    }

    // Return all events
    const result = {};
    let cursor = null;

    do {
      const listResult = await env.EVENTS.list({ cursor });
      for (const key of listResult.keys) {
        const events = await env.EVENTS.get(key.name, { type: "json" });
        result[key.name] = Array.isArray(events) ? events : [];
      }
      cursor = listResult.list_complete ? null : listResult.cursor;
    } while (cursor);

    return Response.json(result);
  } catch (e) {
    console.error("Failed to read events:", e);
    return Response.json({ error: "Failed to read events" }, { status: 500 });
  }
}
