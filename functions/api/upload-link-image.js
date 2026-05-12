import { Octokit } from "@octokit/rest";
import { verifyAuth } from "../lib/auth.js";

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!verifyAuth(request, env)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { linkId, imageBase64 } = await request.json();
    if (!linkId || !imageBase64) {
      return Response.json({ error: "Missing linkId or imageBase64" }, { status: 400 });
    }

    const octokit = new Octokit({ auth: env.GITHUB_TOKEN });
    const [owner, repo] = env.GITHUB_REPO.split("/");

    const imagePath = `data/link-images/${linkId}.jpg`;
    let imageSha;
    try {
      const { data } = await octokit.repos.getContent({ owner, repo, path: imagePath });
      imageSha = data.sha;
    } catch (e) {
      // File doesn't exist yet
    }

    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: imagePath,
      message: `Update link image for ${linkId}`,
      content: imageBase64,
      sha: imageSha,
    });

    return Response.json({ ok: true, image: `/${imagePath}` });
  } catch (e) {
    console.error("Failed to upload link image:", e);
    return Response.json({ error: "Failed to upload link image" }, { status: 500 });
  }
}
