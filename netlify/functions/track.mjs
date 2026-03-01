import { getStore } from "@netlify/blobs";

async function loadSiteData(reqUrl) {
  // Try blob store first (instant updates)
  try {
    const store = getStore("site-data");
    const data = await store.get("current", { type: "json" });
    if (data) return data;
  } catch (e) {
    console.error("Failed to read site data from blob:", e);
  }
  // Fall back to static file via fetch (Functions v2 compatible)
  try {
    const url = new URL("/data/site-data.json", reqUrl);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Static file fetch failed: ${res.status}`);
    return await res.json();
  } catch (e) {
    console.error("Failed to fetch static fallback:", e);
    return null;
  }
}

function findLinkUrl(data, linkId) {
  for (const section of data.sections) {
    for (const link of section.links) {
      if (link.id === linkId) return link.url;
    }
  }
  for (const social of data.socials) {
    if (social.id === linkId) return social.url;
  }
  return null;
}

export default async (req, context) => {
  const url = new URL(req.url);

  // Support both /go/:id (pretty) and /api/track?id=X (legacy)
  const id = context.params?.id || url.searchParams.get("id");

  if (!id) {
    return new Response("Missing id parameter", { status: 400 });
  }

  const data = await loadSiteData(req.url);
  if (!data) {
    return new Response("Site data unavailable", { status: 500 });
  }

  const targetUrl = findLinkUrl(data, id);

  if (!targetUrl) {
    return new Response("Link not found", { status: 404 });
  }

  // Build the redirect response first so tracking errors can't block it
  const redirectResponse = new Response(null, {
    status: 302,
    headers: { Location: targetUrl },
  });

  // Fire-and-forget: store click count + detailed event in background
  const trackingWork = (async () => {
    // Increment click count
    try {
      const store = getStore("clicks");
      const current = await store.get(id);
      const count = current ? parseInt(current, 10) + 1 : 1;
      await store.set(id, String(count));
    } catch (e) {
      console.error("Failed to track click:", e);
    }

    // Store detailed event
    try {
      const store = getStore("events");
      const referer = req.headers.get("referer") || req.headers.get("referrer");
      let referrerHost = null;
      if (referer) {
        try { referrerHost = new URL(referer).hostname; } catch {}
      }

      const event = {
        t: new Date().toISOString(),
        r: referrerHost,
        ua: (req.headers.get("user-agent") || "").slice(0, 200),
        co: context.geo?.country?.code || null,
      };

      const existing = await store.get(id, { type: "json" });
      const events = Array.isArray(existing) ? existing : [];
      events.push(event);

      // Cap at 1000 events per link
      if (events.length > 1000) {
        events.splice(0, events.length - 1000);
      }

      await store.setJSON(id, events);
    } catch (e) {
      console.error("Failed to store event:", e);
    }
  })();

  // Use waitUntil if available (production), otherwise fire-and-forget
  if (context.waitUntil) {
    context.waitUntil(trackingWork);
  } else {
    trackingWork.catch((e) => console.error("Background tracking error:", e));
  }

  return redirectResponse;
};

export const config = {
  path: ["/go/:id", "/api/track"],
};
