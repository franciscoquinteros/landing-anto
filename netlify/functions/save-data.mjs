import { Octokit } from "@octokit/rest";
import { getStore } from "@netlify/blobs";
import { verifyAuth } from "./lib/auth.mjs";

export default async (req, context) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!verifyAuth(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const siteData = await req.json();
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const [owner, repo] = process.env.GITHUB_REPO.split("/");
    const filePath = "data/site-data.json";

    // Get current file SHA
    let sha;
    try {
      const { data } = await octokit.repos.getContent({ owner, repo, path: filePath });
      sha = data.sha;
    } catch (e) {
      // File doesn't exist yet, that's ok
    }

    const content = Buffer.from(JSON.stringify(siteData, null, 2) + "\n").toString("base64");

    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message: "Update site data from admin panel",
      content,
      sha,
    });

    // Write to Netlify Blobs for instant reads (no rebuild needed)
    const store = getStore("site-data");
    await store.setJSON("current", siteData);

    return Response.json({ ok: true });
  } catch (e) {
    console.error("Failed to save data:", e);
    return Response.json({ error: "Failed to save data" }, { status: 500 });
  }
};

export const config = {
  path: "/api/save-data",
};
