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

## Episode cards, order, and Substack links

- **Order:** episodes appear in the same order as the YouTube channel's Videos tab.
- **Play button:** clicking a thumbnail plays the episode right on the page.
- **Substack arrow ("Read on Substack"):** shown only when the site can find the write-up. It looks, in this order, at `content/substack.json`, a `substack:` line in an `content/interviews/*.md` file, a Substack post that embeds the video, a Substack link pasted into the YouTube description, and finally a title match. The easiest way: paste the Substack article link into the YouTube video description. To set one by hand, add it to `content/substack.json`:

```json
{ "VIDEO_ID": "https://calledtocause.substack.com/p/your-article" }
```

## Changing the order of two or more episodes

Episodes follow the YouTube channel's order. To swap some of them, list a few words from each title, in the order you want them, in `content/order.json`. Only the episodes you list trade places with each other; everything else stays put.

```json
{ "order": ["Sex, Somatics", "Neither Side Shows Up First"] }
```
