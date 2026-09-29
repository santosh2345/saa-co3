# SAA-C03 Practice

Offline-friendly practice app for the AWS Certified Solutions Architect – Associate (SAA-C03) exam, covering all 905 questions with per-question progress tracking, flags, notes, topic filters, search, a read-all view and a 65-question timed exam mode.

It is a static site: one HTML page with the questions embedded. Progress is stored in the browser (use **⋯ → Export / Import progress** to back it up or move it between devices).

## Project layout

```
data/questions.json        question bank (source data)
src/index.template.html    the app (HTML, CSS, JS) with a __DATA__ placeholder
scripts/build.mjs          injects the questions into the template
public/index.html          build output (generated, git-ignored)
api/auth.js                sign up / sign in / sign out (Vercel Function)
api/progress.js            load and save synced progress (Vercel Function)
api/_lib.js                Redis + password helpers
vercel.json                tells Vercel to run the build and serve public/
```

## Develop

```
npm run build        # writes public/index.html
```

Then open `public/index.html` in a browser. No dependencies to install; Node 18+ is enough.

## Deploy on Vercel

Import the GitHub repo in Vercel. `vercel.json` sets everything (no framework, build `npm run build`, output `public`), so the default settings work. Every push to the main branch redeploys.

## Sync across devices

Optional sign-in (username + password) syncs progress, flags and notes between phone and laptop. Data is stored in Upstash Redis; passwords are hashed with scrypt.

One-time setup in Vercel: **Project → Storage → Create Database → Upstash (Redis) → Connect to project**, then redeploy. The integration adds the `KV_REST_API_URL` and `KV_REST_API_TOKEN` environment variables the API reads. Without it the app still works, just without sync.
