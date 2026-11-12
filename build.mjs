// Static site generator for calledtocause.com — no dependencies. Run: node build.mjs
import fs from 'node:fs';
import path from 'node:path';

const SITE = process.env.SITE_URL || 'https://calledtocause.com';
const CHANNEL_ID = 'UCvBZ6phclijg2x_AbXHR9cg';
const YT_FEED = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
const TAGLINE = "Because the best companies aren't just funded; they're called into being.";
const DESC = 'Unfiltered conversations with the founders building category-defining companies and the investors backing them, hosted by Twinee Madan.';
const LINKS = {
  youtube: 'https://www.youtube.com/@calledtocause',
  spotify: process.env.SPOTIFY_URL || '',
  substack: process.env.SUBSTACK_URL || '',
  x: process.env.X_URL || '',
  intermission: process.env.INTERMISSION_URL || '',
};
const root = path.dirname(new URL(import.meta.url).pathname);
const out = path.join(root, 'dist');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const list = d => { try { return fs.readdirSync(path.join(root, d)); } catch { console.warn('Folder not found, skipping:', d); return []; } };
const write = (p, s) => { const f = path.join(out, p); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s); };
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
const fmt = d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

function front(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return [{}, raw];
  const fm = {};
  for (const line of m[1].split('\n')) { const i = line.indexOf(':'); if (i > 0) fm[line.slice(0, i).trim()] = line.slice(i + 1).trim(); }
  return [fm, m[2]];
}
function md(src) {
  const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[(.+?)\]\((https?:[^)\s]+)\)/g, '<a href="$2">$1</a>');
  return src.trim().split(/\n{2,}/).map(b => {
    if (/^## /.test(b)) return `<h2>${inline(b.slice(3))}</h2>`;
    if (/^### /.test(b)) return `<h3>${inline(b.slice(4))}</h3>`;
    if (/^[-*] /m.test(b)) return `<ul>${b.split('\n').map(l => `<li>${inline(l.replace(/^[-*] /, ''))}</li>`).join('')}</ul>`;
    return `<p>${inline(b.replace(/\n/g, ' '))}</p>`;
  }).join('\n');
}

// ---------- content ----------
const posts = list('content/blog').filter(f => f.endsWith('.md')).map(f => {
  const [fm, body] = front(read('content/blog/' + f));
  return { ...fm, slug: fm.slug || slug(fm.title || f), html: md(body) };
}).filter(p => p.title && p.draft !== 'true').sort((a, b) => b.date.localeCompare(a.date));

async function youtubeEntries() {
  try {
    const r = await fetch(YT_FEED, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error(r.status);
    const xml = await r.text();
    return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(m => {
      const g = re => (m[1].match(re) || [])[1] || '';
      const un = s => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
      return { title: un(g(/<title>([\s\S]*?)<\/title>/)), date: g(/<published>(.*?)<\/published>/).slice(0, 10), youtube: g(/<yt:videoId>(.*?)<\/yt:videoId>/),
        summary: un(g(/<media:description>([\s\S]*?)<\/media:description>/)).split('\n').filter(Boolean).slice(0, 2).join(' ').slice(0, 280), html: '' };
    });
  } catch (e) { console.warn('YouTube feed unavailable, using only content/interviews:', e.message || e); return []; }
}
const manual = list('content/interviews').filter(f => f.endsWith('.md') && f !== 'README.md').map(f => {
  const [fm, body] = front(read('content/interviews/' + f)); return { ...fm, html: md(body) };
});
const byId = new Map();
for (const e of await youtubeEntries()) byId.set(e.youtube, e);
for (const e of manual) byId.set(e.youtube || e.title, { ...(byId.get(e.youtube) || {}), ...e });
const interviews = [...byId.values()].filter(e => e.title).map(e => ({ ...e, slug: slug(e.title) })).sort((a, b) => b.date.localeCompare(a.date));

const events = (() => { try { return JSON.parse(read('content/events.json')).events || []; } catch { console.warn('content/events.json missing or invalid, no events'); return []; } })().filter(e => !e.draft && e.name);
const today = new Date().toISOString().slice(0, 10);
const upcoming = events.filter(e => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
const past = events.filter(e => e.date < today).sort((a, b) => b.date.localeCompare(a.date));

// ---------- layout ----------
const MARK = `<svg viewBox="-4 -2 108 112" aria-hidden="true"><ellipse class="glow" cx="46" cy="27" rx="27" ry="9.5" transform="rotate(-16 50 20)"/><ellipse class="halo" cx="50" cy="20" rx="27" ry="9.5" transform="rotate(-16 50 20)"/><path class="fig" d="M50 40 L37 57"/><path class="fig" d="M50 40 L63 57"/><path class="fig" d="M45 54 L32 82"/><path class="fig" d="M55 54 L68 82"/></svg>`;
const nav = [['/interviews', 'Interviews'], ['/blog', 'Blog'], ['/events', 'Events'], ['/about', 'About']];
function page({ title, desc = DESC, path: p = '/', body, type = 'website' }) {
  const t = title ? `${title} · Called to Cause` : 'Called to Cause';
  const social = [['YouTube', LINKS.youtube], ['Spotify', LINKS.spotify], ['Substack', LINKS.substack], ['X', LINKS.x]].filter(x => x[1]);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(t)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${SITE}${p}">
<meta property="og:title" content="${esc(t)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:type" content="${type}"><meta property="og:url" content="${SITE}${p}">
<link rel="alternate" type="application/rss+xml" title="Called to Cause — everything" href="/rss.xml">
<link rel="alternate" type="application/rss+xml" title="Called to Cause — interviews" href="/interviews.xml">
<link rel="alternate" type="application/rss+xml" title="Called to Cause — blog" href="/blog.xml">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:ital,wght@0,400;0,700;0,800;0,900;1,400&display=swap">
<link rel="stylesheet" href="/style.css"></head><body>
<header class="site"><div class="wrap"><a class="brand" href="/" aria-label="Called to Cause home">${MARK}<span class="wm">Called<br>to Cause</span></a>
<nav aria-label="Main">${nav.map(([h, l]) => `<a href="${h}"${p.startsWith(h) ? ' aria-current="page"' : ''}>${l}</a>`).join('')}</nav></div></header>
<main>${body}</main>
<footer><div class="wrap"><div><div class="brand" style="color:var(--cream)">${MARK.replace('class="halo"','class="halo" style="stroke:#E05AB0"').replace('class="glow"','class="glow" style="fill:#F2B3D8;fill-opacity:.55"')}<span class="wm">Called<br>to Cause</span></div><br>${esc(TAGLINE)}</div>
<div>${social.map(([l, u]) => `<a href="${esc(u)}">${l}</a>`).join(' · ')}${social.length ? ' · ' : ''}<a href="/rss.xml">RSS</a></div></div></footer></body></html>`;
}
const card = (href, img, eyebrow, title, meta, sum) => `<article class="card">${img ? `<a href="${href}" tabindex="-1" aria-hidden="true"><img src="${img}" alt="" loading="lazy"></a>` : ''}<div class="b"><p class="eyebrow">${eyebrow}</p><h3><a href="${href}">${esc(title)}</a></h3><div class="meta">${meta}</div>${sum ? `<p>${esc(sum)}</p>` : ''}</div></article>`;
const thumb = e => e.youtube ? `https://i.ytimg.com/vi/${e.youtube}/hqdefault.jpg` : '';
const iCard = e => card(`/interviews/${e.slug}`, thumb(e), 'Interview', e.title, `${fmt(e.date)}${e.guest ? ' · ' + esc(e.guest) : ''}`, e.summary);
const bCard = p => card(`/blog/${p.slug}`, '', 'Blog', p.title, fmt(p.date), p.summary);
const eventList = list => list.length ? `<ul class="list">${list.map(e => `<li><div class="when">${fmt(e.date)}</div><div><h3>${e.url ? `<a href="${esc(e.url)}" style="color:inherit">${esc(e.name)}</a>` : esc(e.name)}</h3><div class="meta">${esc(e.location || '')}${e.host ? ' · ' + esc(e.host) : ''}</div></div></li>`).join('')}</ul>` : '';

// ---------- pages ----------
write('style.css', fs.existsSync(path.join(root, 'static/style.css')) ? read('static/style.css') : read('style.css'));
write('favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -2 108 112"><rect x="-10" y="-6" width="130" height="124" fill="#6A4C9C"/><ellipse cx="46" cy="27" rx="27" ry="9.5" fill="#F2B3D8" fill-opacity="0.5" transform="rotate(-16 50 20)"/><ellipse cx="50" cy="20" rx="27" ry="9.5" fill="none" stroke="#FCFAF2" stroke-width="7" transform="rotate(-16 50 20)"/><g fill="none" stroke="#FCFAF2" stroke-width="8.5" stroke-linecap="round"><path d="M50 40 L37 57"/><path d="M50 40 L63 57"/><path d="M45 54 L32 82"/><path d="M55 54 L68 82"/></g></svg>`);

write('index.html', page({ body: `<div class="wrap"><div class="hero"><div class="rings"></div><p class="eyebrow">A show for founders and investors</p>
<h1>Every founder has an origin story. Every investor has a reason they said yes.</h1>
<p class="lead">${esc(DESC)}</p><a class="btn" href="/interviews">Watch the interviews</a><a class="btn ghost" href="/about">About the show</a></div>
<section><div class="sh"><h2>Latest interviews</h2><a href="/interviews">All interviews</a></div>${interviews.length ? `<div class="grid">${interviews.slice(0, 3).map(iCard).join('')}</div>` : '<div class="empty">New conversations are on the way.</div>'}</section>
<section><div class="sh"><h2>From the blog</h2><a href="/blog">All posts</a></div>${posts.length ? `<div class="grid">${posts.slice(0, 3).map(bCard).join('')}</div>` : '<div class="empty">First post coming soon.</div>'}</section>
<section><div class="band"><p class="eyebrow" style="color:inherit">Find us in person</p><h2>Where Intermission will be</h2><p>${upcoming.length ? `Next up: <strong>${esc(upcoming[0].name)}</strong>, ${fmt(upcoming[0].date)}${upcoming[0].location ? ' in ' + esc(upcoming[0].location) : ''}.` : 'Events are being added. Check back soon.'} <a href="/events">See all events</a></p></div></section></div>` }));

write('interviews/index.html', page({ title: 'Interviews', path: '/interviews', desc: 'Every Called to Cause interview with founders and investors.', body: `<div class="wrap"><div class="hero" style="padding-bottom:16px"><p class="eyebrow">Called to Cause</p><h1>Interviews</h1><p class="lead">Founders on what it costs to build. Investors on why they said yes.</p></div><section style="border:0">${interviews.length ? `<div class="grid">${interviews.map(iCard).join('')}</div>` : '<div class="empty">No interviews published yet.</div>'}</section></div>` }));
for (const e of interviews) write(`interviews/${e.slug}/index.html`, page({ title: e.title, path: `/interviews/${e.slug}`, desc: e.summary || DESC, type: 'article', body: `<div class="wrap article"><div class="hero" style="padding-bottom:0"><p class="eyebrow">Interview</p><h1 style="font-size:clamp(32px,6vw,48px);line-height:1.08">${esc(e.title)}</h1><p class="meta" style="margin-top:12px">${fmt(e.date)}${e.guest ? ' · ' + esc(e.guest) : ''}</p></div>
${e.youtube ? `<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/${e.youtube}" title="${esc(e.title)}" loading="lazy" allowfullscreen></iframe></div>` : ''}
${e.html || (e.summary ? `<p>${esc(e.summary)}</p>` : '')}${e.spotify ? `<p><a href="${esc(e.spotify)}">Listen on Spotify</a></p>` : ''}</div>` }));

write('blog/index.html', page({ title: 'Blog', path: '/blog', desc: 'Notes from the Called to Cause conversations.', body: `<div class="wrap"><div class="hero" style="padding-bottom:16px"><p class="eyebrow">Called to Cause</p><h1>Blog</h1></div><section style="border:0">${posts.length ? `<div class="grid">${posts.map(bCard).join('')}</div>` : '<div class="empty">First post coming soon.</div>'}</section></div>` }));
for (const p of posts) write(`blog/${p.slug}/index.html`, page({ title: p.title, path: `/blog/${p.slug}`, desc: p.summary || DESC, type: 'article', body: `<div class="wrap article"><div class="hero" style="padding-bottom:16px"><p class="eyebrow">Blog</p><h1 style="font-size:clamp(32px,6vw,48px);line-height:1.08">${esc(p.title)}</h1><p class="meta" style="margin-top:12px">${fmt(p.date)} · Twinee Madan</p></div>${p.html}</div>` }));

write('events/index.html', page({ title: 'Events', path: '/events', desc: 'Events Intermission will be at.', body: `<div class="wrap"><div class="hero" style="padding-bottom:16px"><p class="eyebrow">Intermission</p><h1>Events</h1><p class="lead">Where to find us. Intermission provides event services to startups and VCs${LINKS.intermission ? ` — <a href="${esc(LINKS.intermission)}">learn more</a>` : ''}.</p></div>
<section style="border:0"><h2 style="margin-bottom:16px">Upcoming</h2>${eventList(upcoming) || '<div class="empty">No upcoming events listed yet.</div>'}</section>${past.length ? `<section><h2 style="margin-bottom:16px">Past</h2>${eventList(past)}</section>` : ''}</div>` }));

write('about/index.html', page({ title: 'About', path: '/about', body: `<div class="wrap article"><div class="hero" style="padding-bottom:16px"><p class="eyebrow">About</p><h1>Called to Cause</h1></div>
<p>Every founder has an origin story. Every investor has a reason they said yes. Called to Cause is the show where we get both.</p>
<p>Hosted by Twinee Madan, this series features unfiltered conversations with the builders creating category-defining companies and the investors putting their capital where their conviction is. No pitch decks, no polish. Just the real moments: the years nobody saw, the check that almost didn't get written, the belief that outlasted the doubt.</p>
<p>Founders talk about what it actually costs to build: the trade-offs, the pivots, the thing they got wrong before they got it right. Investors talk about why they said yes when everyone else said no, and what conviction looks like before the traction does.</p>
<p>This isn't capital and company-building told separately. It's the same story, from both sides of the table.</p>
<p><em>${esc(TAGLINE)}</em></p>
<h2>Follow along</h2><p>Subscribe on <a href="${LINKS.youtube}">YouTube</a> or add our <a href="/rss.xml">RSS feed</a> to your reader.</p></div>` }));

write('404.html', page({ title: 'Not found', body: `<div class="wrap"><div class="hero"><h1>Not found</h1><p class="lead"><a href="/">Back to the home page</a></p></div></div>` }));

// ---------- RSS ----------
const cdata = s => `<![CDATA[${String(s).replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;
function feed(file, title, items) {
  const rows = items.map(i => `<item><title>${cdata(i.title)}</title><link>${SITE}${i.url}</link><guid isPermaLink="true">${SITE}${i.url}</guid><pubDate>${new Date(i.date).toUTCString()}</pubDate><category>${i.kind}</category><description>${cdata(i.summary || '')}</description>${i.content ? `<content:encoded>${cdata(i.content)}</content:encoded>` : ''}${i.image ? `<enclosure url="${i.image}" type="image/jpeg" length="0"/>` : ''}</item>`).join('\n');
  write(file, `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel>
<title>${esc(title)}</title><link>${SITE}</link><description>${esc(DESC)}</description><language>en-us</language><lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
<atom:link href="${SITE}/${file}" rel="self" type="application/rss+xml"/>
${rows}
</channel></rss>`);
}
const iItems = interviews.map(e => ({ kind: 'Interview', title: e.title, url: `/interviews/${e.slug}`, date: e.date, summary: e.summary, image: thumb(e),
  content: `${e.youtube ? `<p><a href="https://www.youtube.com/watch?v=${e.youtube}">Watch on YouTube</a></p>` : ''}${e.html || ''}` }));
const bItems = posts.map(p => ({ kind: 'Blog', title: p.title, url: `/blog/${p.slug}`, date: p.date, summary: p.summary, content: p.html }));
const all = [...iItems, ...bItems].sort((a, b) => b.date.localeCompare(a.date));
feed('rss.xml', 'Called to Cause', all); feed('interviews.xml', 'Called to Cause — Interviews', iItems); feed('blog.xml', 'Called to Cause — Blog', bItems);

// sitemap + robots
const urls = ['/', '/interviews', '/blog', '/events', '/about', ...interviews.map(e => `/interviews/${e.slug}`), ...posts.map(p => `/blog/${p.slug}`)];
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u => `<url><loc>${SITE}${u}</loc></url>`).join('')}</urlset>`);
write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`Built ${interviews.length} interviews, ${posts.length} posts, ${events.length} events → dist/`);
