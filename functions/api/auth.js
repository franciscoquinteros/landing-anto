export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { password } = await request.json();
    const adminPassword = env.ADMIN_PASSWORD;

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
}
