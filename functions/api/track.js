import { handleTrack } from "../lib/track-handler.js";

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const id = url.searchParams.get("id");
  return handleTrack(context, id);
}
