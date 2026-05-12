import { handleTrack } from "../lib/track-handler.js";

export async function onRequest(context) {
  return handleTrack(context, context.params.id);
}
