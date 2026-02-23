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
    const { imageBase64 } = await req.json();
    if (!imageBase64) {
      return Response.json({ error: "Missing imageBase64" }, { status: 400 });
    }

    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const [owner, repo] = process.env.GITHUB_REPO.split("/");

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

    // Update site-data.json to reference the image
    const dataPath = "data/site-data.json";
    const { data: fileData } = await octokit.repos.getContent({ owner, repo, path: dataPath });
    const siteData = JSON.parse(Buffer.from(fileData.content, "base64").toString("utf8"));
    siteData.image = "/data/profile.jpg";

    const updatedContent = Buffer.from(JSON.stringify(siteData, null, 2) + "\n").toString("base64");
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: dataPath,
      message: "Update image reference in site data",
      content: updatedContent,
      sha: fileData.sha,
    });

    return Response.json({ ok: true, image: "/data/profile.jpg" });
  } catch (e) {
    console.error("Failed to upload image:", e);
    return Response.json({ error: "Failed to upload image" }, { status: 500 });
  }
};

export const config = {
  path: "/api/upload-image",
};
