async function loadSiteData(env, requestUrl) {
  // Try KV store first (instant updates)
  try {
    const data = await env.SITE_DATA.get("current", { type: "json" });
    if (data) return data;
  } catch (e) {
    console.error("Failed to read site data from KV:", e);
  }
  // Fall back to static file via ASSETS binding
  try {
    const assetUrl = new URL("/data/site-data.json", requestUrl);
    const res = await env.ASSETS.fetch(new Request(assetUrl));
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

export async function handleTrack(context, id) {
  const { request, env } = context;

  if (!id) {
    return new Response("Missing id parameter", { status: 400 });
  }

  const data = await loadSiteData(env, request.url);
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
      const current = await env.CLICKS.get(id);
      const count = current ? parseInt(current, 10) + 1 : 1;
      await env.CLICKS.put(id, String(count));
    } catch (e) {
      console.error("Failed to track click:", e);
    }

    // Store detailed event
    try {
      const referer = request.headers.get("referer") || request.headers.get("referrer");
      let referrerHost = null;
      if (referer) {
        try { referrerHost = new URL(referer).hostname; } catch {}
      }

      const event = {
        t: new Date().toISOString(),
        r: referrerHost,
        ua: (request.headers.get("user-agent") || "").slice(0, 200),
        co: request.cf?.country || null,
      };

      const existing = await env.EVENTS.get(id, { type: "json" });
      const events = Array.isArray(existing) ? existing : [];
      events.push(event);

      // Cap at 1000 events per link
      if (events.length > 1000) {
        events.splice(0, events.length - 1000);
      }

      await env.EVENTS.put(id, JSON.stringify(events));
    } catch (e) {
      console.error("Failed to store event:", e);
    }
  })();

  // Use waitUntil to ensure tracking completes
  context.waitUntil(trackingWork);

  return redirectResponse;
}
