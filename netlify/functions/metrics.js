const { getStore } = require("@netlify/blobs");

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
  if (!verifyAuth(event)) {
    return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  try {
    const store = getStore("clicks");
    const { blobs } = await store.list();
    const metrics = {};

    for (const blob of blobs) {
      const value = await store.get(blob.key);
      metrics[blob.key] = parseInt(value, 10) || 0;
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(metrics),
    };
  } catch (e) {
    console.error("Failed to read metrics:", e);
    return { statusCode: 500, body: JSON.stringify({ error: "Failed to read metrics" }) };
  }
};
