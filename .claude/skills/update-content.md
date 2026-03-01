# Update Site Content

Update the landing page content by editing `data/site-data.json`.

## Data structure

```json
{
  "name": "Display name",
  "bio": "Bio text with \n for newlines",
  "image": "/data/profile.jpg",
  "socials": [
    { "id": "instagram", "platform": "instagram", "url": "https://..." }
  ],
  "sections": [
    {
      "id": "section-id",
      "title": "SECTION TITLE",
      "links": [
        { "id": "link-id", "label": "Link text", "url": "https://...", "image": "https://..." }
      ]
    }
  ]
}
```

## Steps

1. Read `data/site-data.json` to see current content
2. Make the requested changes
3. Validate the JSON is well-formed
4. Save the file

## Important

- Content is in Spanish
- The `id` fields must be unique within their array
- After editing the static file, deploy to update the site
- The live site reads from Netlify Blobs first, falling back to this static file. Saving via the dashboard updates Blobs immediately, but editing this file requires a deploy to take effect.
- Supported social platforms: `instagram`, `whatsapp`, `tiktok`, `twitter`, `spotify`, `youtube`
