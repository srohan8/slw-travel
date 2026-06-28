# SLW Travel — Blog

Long-form route guides and field notes. Built with Jekyll, served from GitHub Pages.

## Structure

```
/
  _config.yml            ← Jekyll config (permalink, markdown, excludes)
  _layouts/
    post.html            ← layout for every post
  _posts/
    YYYY-MM-DD-slug.md   ← one markdown file per post — Minnal publishes here
  blog/
    index.html           ← listing page, auto-populated from _posts/
    README.md
```

## URLs

- Listing: `/blog/`
- Post: `/blog/<slug>/` (controlled by `permalink: /blog/:slug/` in `_config.yml`)

## Minnal GitHub connector — publish target

- **Publish path:** `_posts/`
- **Filename:** `YYYY-MM-DD-slug.md` (Jekyll requires this exact format — the date is parsed from the filename)
- **Format:** Markdown with YAML front matter (see below)
- **No listing-page edit needed** — `blog/index.html` loops over `site.posts` at build time, so new posts appear automatically, newest first.

## Post front matter

```markdown
---
title: "Istanbul to Tbilisi <em>overland</em>"
date: 2026-05-10
tag: Route guide
excerpt: "Two-sentence hook shown on the listing page."
tags: [turkey, georgia, trains]
---

Markdown body goes here. Use `##` for section headings (they're styled),
standard markdown links, lists, blockquotes, code blocks, and images.
```

Front matter fields:
- `title` — required. HTML allowed (use `<em>…</em>` for the italic sage accent).
- `date` — required. ISO format. Must match the filename date.
- `tag` — optional, single string, shown next to the date.
- `excerpt` — optional, shown on the listing. If omitted, Jekyll auto-generates from the first paragraph.
- `tags` — optional array, shown at the bottom of the post.

## Local preview

```bash
bundle install              # first time only — needs a Gemfile
bundle exec jekyll serve
```

GitHub Pages builds automatically on push — no Gemfile required for the default github-pages gem.

## Enabling GitHub Pages

In the repo's **Settings → Pages**: set source to the `main` branch, root (`/`). Jekyll will pick up `_config.yml` and build the site.
