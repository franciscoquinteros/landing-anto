export default async (req, context) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { password } = await req.json();
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      return Response.json({ error: "ADMIN_PASSWORD not configured" }, { status: 500 });
    }

    if (password !== adminPassword) {
      return Response.json({ error: "Invalid password" }, { status: 401 });
    }

    const token = Buffer.from(`${adminPassword}:${Date.now()}`).toString("base64");

    return Response.json({ token });
  } catch (e) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
};

export const config = {
  path: "/api/auth",
};
