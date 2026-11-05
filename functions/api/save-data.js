import { Octokit } from "@octokit/rest";
import { verifyAuth } from "../lib/auth.js";

async function commitToGitHub(env, siteData) {
  const octokit = new Octokit({ auth: env.GITHUB_TOKEN });
  const [owner, repo] = (env.GITHUB_REPO || "").split("/");
  if (!owner || !repo) throw new Error("GITHUB_REPO not configured (expected owner/repo)");
  const filePath = "data/site-data.json";

  // Get current file SHA (required to update an existing file)
  let sha;
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path: filePath });
    sha = data.sha;
  } catch (e) {
    // 404 = file doesn't exist yet, that's ok. Anything else (401, 403...) is a real problem.
    if (e.status !== 404) throw e;
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
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!verifyAuth(request, env)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let siteData;
  try {
    siteData = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // KV is what /api/site-data reads, so this is what makes the change live.
  // Write it first so a GitHub problem can't block the save.
  try {
    await env.SITE_DATA.put("current", JSON.stringify(siteData));
  } catch (e) {
    console.error("Failed to write site data to KV:", e);
    return Response.json({ error: `KV write failed: ${e.message}` }, { status: 500 });
  }

  // GitHub commit is a backup / static fallback. Report failures without failing the save.
  try {
    await commitToGitHub(env, siteData);
    return Response.json({ ok: true });
  } catch (e) {
    const detail = e.status ? `GitHub ${e.status}: ${e.message}` : e.message;
    console.error("Saved to KV but GitHub commit failed:", detail);
    return Response.json({ ok: true, warning: `Guardado, pero falló el backup en GitHub (${detail})` });
  }
}
