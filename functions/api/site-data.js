export async function onRequest(context) {
  const { request, env } = context;

  try {
    const data = await env.SITE_DATA.get("current");
    if (data && data !== "null") {
      return new Response(data, {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
      });
    }
  } catch (e) {
    console.error("Failed to read from KV store:", e);
  }

  // Fall back to static file via ASSETS binding
  try {
    const assetUrl = new URL("/data/site-data.json", request.url);
    const res = await env.ASSETS.fetch(new Request(assetUrl));
    if (!res.ok) throw new Error(`Static file fetch failed: ${res.status}`);
    const body = await res.text();
    return new Response(body, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
    });
  } catch (e) {
    console.error("Failed to fetch static fallback:", e);
    return new Response("Site data not found", { status: 404 });
  }
}
