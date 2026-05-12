import { Octokit } from "@octokit/rest";
import { verifyAuth } from "../lib/auth.js";

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!verifyAuth(request, env)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { imageBase64 } = await request.json();
    if (!imageBase64) {
      return Response.json({ error: "Missing imageBase64" }, { status: 400 });
    }

    const octokit = new Octokit({ auth: env.GITHUB_TOKEN });
    const [owner, repo] = env.GITHUB_REPO.split("/");

    // Upload the image file
    const imagePath = "data/profile.jpg";
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
      message: "Update profile image from admin panel",
      content: imageBase64,
      sha: imageSha,
    });

    // Cache-bust the image URL so browsers fetch the new file instead of the cached one
    const versionedImage = `/data/profile.jpg?v=${Date.now()}`;

    return Response.json({ ok: true, image: versionedImage });
  } catch (e) {
    console.error("Failed to upload image:", e);
    return Response.json({
      error: "Failed to upload image",
      detail: e?.message || String(e),
      status: e?.status,
      response: e?.response?.data,
    }, { status: 500 });
  }
}
