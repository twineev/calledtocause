# calledtocause.com

Static site, no dependencies. `node build.mjs` writes `dist/`.

## Adding content
- **Interviews**: pulled automatically from the YouTube channel on every build. Add `content/interviews/<name>.md` (see README there) to add a guest name, Spotify link or show notes to an episode.
- **Blog**: add `content/blog/<slug>.md` with `title`, `date`, `summary` front matter. Set `draft: true` to hide.
- **Events**: edit `content/events.json`. Entries marked `"draft": true` are hidden; past dates move to "Past" automatically.
- Optional env vars on Vercel: `SPOTIFY_URL`, `SUBSTACK_URL`, `X_URL`, `INTERMISSION_URL` (shown in the footer/events).

## Feeds
`/rss.xml` (interviews + blog), `/interviews.xml`, `/blog.xml`.
Point Zapier, IFTTT or dlvr.it at `/rss.xml` to post new items to your X profile. In Substack, use Settings > Import to bring in `/blog.xml`; Substack's RSS import is one-time, so new posts there are copied over or cross-posted.

## Deploy (Vercel)
1. Push this folder to a GitHub repo and import it in Vercel (framework: Other; settings come from vercel.json).
2. Project > Domains: add calledtocause.com and follow the DNS instructions.
3. Set a Vercel Deploy Hook on a daily cron (or after publishing a video) so new YouTube episodes appear.

## Deploy (Netlify)
netlify.toml is included: build command `node build.mjs`, publish directory `dist`. Import the repo in Netlify (Add new site > Import an existing project), then add calledtocause.com under Domain management.
