# Deploy Site

Deploy the landing page to production.

## Steps

1. Run `git status` to check for uncommitted changes
2. If there are uncommitted changes, ask the user whether to commit them first
3. Push to `master`: `git push origin master`
4. The GitHub Action will auto-deploy to Netlify
5. Wait ~30 seconds, then check deploy status with `netlify status`
6. Report the live URL (https://antonellalancuba.com) and deploy status

## Notes

- The site auto-deploys on push to master via `.github/workflows/deploy.yml`
- For manual deploy without pushing: `netlify deploy --prod`
- No build step is needed — static files are deployed as-is
