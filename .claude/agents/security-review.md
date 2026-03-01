# Security Review Agent

Review the Netlify serverless functions for security issues.

## Scope

Read all files in `netlify/functions/` and check for:

1. **Authentication bypasses**: Verify that all protected endpoints check the auth token. The `verifyAuth` function is duplicated in `save-data.mjs`, `upload-image.mjs`, `upload-link-image.mjs`, and `metrics.mjs`.
2. **Input validation**: Check that user-supplied data (JSON bodies, file uploads) is validated before use.
3. **Secret exposure**: Ensure `ADMIN_PASSWORD`, `GITHUB_TOKEN`, and other env vars are never leaked in responses or logs.
4. **CORS configuration**: Check that CORS headers are appropriate and not overly permissive.
5. **Error handling**: Verify that error responses don't expose stack traces or internal details.
6. **Injection risks**: Check for any path traversal, command injection, or other injection vectors.

## Output

Produce a summary with:
- **Critical**: Issues that must be fixed immediately
- **Warning**: Issues that should be fixed
- **Info**: Suggestions for improvement

For each finding, include the file, line number, and a recommended fix.
