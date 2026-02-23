import { Octokit } from "@octokit/rest";

function verifyAuth(req) {
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return false;
  const token = auth.slice(7);
  try {
    const decoded = Buffer.from(token, "base64").toString("utf8");
    const [password] = decoded.split(":");
    return password === process.env.ADMIN_PASSWORD;
  } catch {
    return false;
  }
}

export default async (req, context) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!verifyAuth(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { linkId, imageBase64 } = await req.json();
    if (!linkId || !imageBase64) {
      return Response.json({ error: "Missing linkId or imageBase64" }, { status: 400 });
    }

    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const [owner, repo] = process.env.GITHUB_REPO.split("/");

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
};

export const config = {
  path: "/api/upload-link-image",
};
