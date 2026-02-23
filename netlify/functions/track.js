const { getStore } = require("@netlify/blobs");
const fs = require("fs");
const path = require("path");

function loadSiteData() {
  const filePath = path.resolve(__dirname, "../../data/site-data.json");
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function findLinkUrl(data, linkId) {
  for (const section of data.sections) {
    for (const link of section.links) {
      if (link.id === linkId) return link.url;
    }
  }
  for (const social of data.socials) {
    if (social.id === linkId) return social.url;
  }
  return null;
}

exports.handler = async (event) => {
  const id = event.queryStringParameters && event.queryStringParameters.id;

  if (!id) {
    return { statusCode: 400, body: "Missing id parameter" };
  }

  const data = loadSiteData();
  const url = findLinkUrl(data, id);

  if (!url) {
    return { statusCode: 404, body: "Link not found" };
  }

  // Increment click count in Netlify Blobs
  try {
    const store = getStore("clicks");
    const current = await store.get(id);
    const count = current ? parseInt(current, 10) + 1 : 1;
    await store.set(id, String(count));
  } catch (e) {
    console.error("Failed to track click:", e);
  }

  return {
    statusCode: 302,
    headers: { Location: url },
    body: "",
  };
};
