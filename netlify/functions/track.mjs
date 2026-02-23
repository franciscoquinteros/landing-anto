import { getStore } from "@netlify/blobs";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadSiteData() {
  const filePath = resolve(__dirname, "../../data/site-data.json");
  return JSON.parse(readFileSync(filePath, "utf8"));
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
  const id = url.searchParams.get("id");

  if (!id) {
    return new Response("Missing id parameter", { status: 400 });
  }

  const data = loadSiteData();
  const targetUrl = findLinkUrl(data, id);

  if (!targetUrl) {
    return new Response("Link not found", { status: 404 });
  }

  // Increment click count in Netlify Blobs
  try {
    const store = getStore("clicks");
    const current = await store.get(id);
    const count = current ? parseInt(current, 10) + 1 : 1;
    await store.set(id, String(count));
  } catch (e) {
    console.error("Failed to track click:", e);
  }

  return new Response(null, {
    status: 302,
    headers: { Location: targetUrl },
  });
};

export const config = {
  path: "/api/track",
};
