import { getStore } from "@netlify/blobs";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default async (req, context) => {
  try {
    const store = getStore("site-data");
    const data = await store.get("current");
    if (data) {
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

  // Fall back to static file if blob doesn't exist yet
  try {
    const filePath = resolve(__dirname, "../../data/site-data.json");
    const data = readFileSync(filePath, "utf8");
    return new Response(data, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
    });
  } catch (e) {
    return new Response("Site data not found", { status: 404 });
  }
};

export const config = {
  path: "/api/site-data",
};
