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

    return Response.json({ ok: true });
  } catch (e) {
    console.error("Failed to save data:", e);
    return Response.json({ error: "Failed to save data" }, { status: 500 });
  }
};

export const config = {
  path: "/api/save-data",
};
