const { Octokit } = require("@octokit/rest");

function verifyAuth(event) {
  const auth = event.headers.authorization || "";
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

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  if (!verifyAuth(event)) {
    return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  try {
    const { imageBase64 } = JSON.parse(event.body);
    if (!imageBase64) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing imageBase64" }) };
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

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, image: "/data/profile.jpg" }),
    };
  } catch (e) {
    console.error("Failed to upload image:", e);
    return { statusCode: 500, body: JSON.stringify({ error: "Failed to upload image" }) };
  }
};
