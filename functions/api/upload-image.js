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

    // Write to KV synchronously — this is what the /api/profile-image endpoint
    // reads, so the new image is live the moment this returns.
    const imageBuffer = Buffer.from(imageBase64, "base64");
    await env.SITE_DATA.put("profile-image", imageBuffer);

    // Commit to GitHub in the background. The static /data/profile.jpg path is
    // only used for OG/social-media crawlers and as a fallback when KV is empty.
    // We don't block the response on the redeploy, which takes 30s+.
    context.waitUntil((async () => {
      try {
        const octokit = new Octokit({ auth: env.GITHUB_TOKEN });
        const [owner, repo] = env.GITHUB_REPO.split("/");
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
      } catch (e) {
        console.error("Background GitHub commit failed:", e);
      }
    })());

    const versionedImage = `/api/profile-image?v=${Date.now()}`;

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
