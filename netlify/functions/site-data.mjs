import { getStore } from "@netlify/blobs";

export default async (req, context) => {
  try {
    const store = getStore("site-data");
    const data = await store.get("current");
    if (data && data !== "null") {
      return new Response(data, {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
      });
    }
  } catch (e) {
    console.error("Failed to read from blob store:", e);
  }

  // Fall back to static file via fetch (avoids filesystem path issues in Functions v2)
  try {
    const url = new URL("/data/site-data.json", req.url);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Static file fetch failed: ${res.status}`);
    const data = await res.text();
    return new Response(data, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
    });
  } catch (e) {
    console.error("Failed to fetch static fallback:", e);
    return new Response("Site data not found", { status: 404 });
  }
};

export const config = {
  path: "/api/site-data",
};
