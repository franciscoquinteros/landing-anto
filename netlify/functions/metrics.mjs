import { getStore } from "@netlify/blobs";

function verifyAuth(req) {
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return false;
  const authToken = auth.slice(7);
  try {
    const decoded = Buffer.from(authToken, "base64").toString("utf8");
    const [password] = decoded.split(":");
    return password === process.env.ADMIN_PASSWORD;
  } catch {
    return false;
  }
}

export default async (req, context) => {
  if (!verifyAuth(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const store = getStore("clicks");
    const { blobs } = await store.list();
    const metrics = {};

    for (const blob of blobs) {
      const value = await store.get(blob.key);
      metrics[blob.key] = parseInt(value, 10) || 0;
    }

    return Response.json(metrics);
  } catch (e) {
    console.error("Failed to read metrics:", e);
    return Response.json({ error: "Failed to read metrics" }, { status: 500 });
  }
};

export const config = {
  path: "/api/metrics",
};
