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
    const siteData = JSON.parse(event.body);
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

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true }),
    };
  } catch (e) {
    console.error("Failed to save data:", e);
    return { statusCode: 500, body: JSON.stringify({ error: "Failed to save data" }) };
  }
};
