exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  try {
    const { password } = JSON.parse(event.body);
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      return { statusCode: 500, body: JSON.stringify({ error: "ADMIN_PASSWORD not configured" }) };
    }

    if (password !== adminPassword) {
      return { statusCode: 401, body: JSON.stringify({ error: "Invalid password" }) };
    }

    const token = Buffer.from(`${adminPassword}:${Date.now()}`).toString("base64");

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    };
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid request" }) };
  }
};
