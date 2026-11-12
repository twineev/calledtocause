Interviews are pulled automatically from the YouTube channel at build time.
To add or override one by hand, create a file here (e.g. `guest-name.md`) with front matter:

---
title: Episode title
date: 2026-10-28
guest: Guest Name, role at Company
youtube: VIDEO_ID
spotify: https://open.spotify.com/episode/...   (optional)
summary: One or two sentences.
---
Show notes in markdown.

## Which YouTube videos appear

The site lists **full episodes only**. At build time it reads the channel feed and leaves out anything shorter than 8 minutes (clips, teasers, Shorts). To change the cutoff, set the `MIN_EPISODE_MINUTES` environment variable in Netlify. To hide a specific video, add its ID (the part after `v=` in the YouTube link) to `content/hide.json`:

```json
{ "ids": ["VIDEO_ID_HERE"] }
```
