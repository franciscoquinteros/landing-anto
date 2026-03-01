import { getStore } from "@netlify/blobs";
import { verifyAuth } from "./lib/auth.mjs";

export default async (req, context) => {
  if (!verifyAuth(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const filterId = url.searchParams.get("id");
    const store = getStore("events");

    if (filterId) {
      const events = await store.get(filterId, { type: "json" });
      return Response.json({ [filterId]: events || [] });
    }

    // Return all events
    const { blobs } = await store.list();
    const result = {};

    for (const blob of blobs) {
      const events = await store.get(blob.key, { type: "json" });
      result[blob.key] = Array.isArray(events) ? events : [];
    }

    return Response.json(result);
  } catch (e) {
    console.error("Failed to read events:", e);
    return Response.json({ error: "Failed to read events" }, { status: 500 });
  }
};

export const config = {
  path: "/api/events",
};
