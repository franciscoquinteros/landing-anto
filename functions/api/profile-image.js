export async function onRequest(context) {
  const { request, env } = context;

  try {
    const data = await env.SITE_DATA.get("profile-image", { type: "arrayBuffer" });
    if (data) {
      return new Response(data, {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }
  } catch (e) {
    console.error("Failed to read profile image from KV:", e);
  }

  try {
    const assetUrl = new URL("/data/profile.jpg", request.url);
    return await env.ASSETS.fetch(new Request(assetUrl));
  } catch (e) {
    return new Response("Profile image not found", { status: 404 });
  }
}
