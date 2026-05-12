import { Octokit } from "@octokit/rest";
import { verifyAuth } from "../lib/auth.js";

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!verifyAuth(request, env)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const siteData = await request.json();
    const octokit = new Octokit({ auth: env.GITHUB_TOKEN });
    const [owner, repo] = env.GITHUB_REPO.split("/");
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

    // Write to KV for instant reads (no rebuild needed)
    await env.SITE_DATA.put("current", JSON.stringify(siteData));

    return Response.json({ ok: true });
  } catch (e) {
    console.error("Failed to save data:", e);
    return Response.json({ error: "Failed to save data" }, { status: 500 });
  }
}
