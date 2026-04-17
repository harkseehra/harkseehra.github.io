# THE TRUTH · حقیقت

Personal writing site by Harkirat Seehra. Essays on behavioural psychology, philosophy, and spirituality. Stories — parables, prophetic retellings, original fiction. Multilingual.

Built with [Astro](https://astro.build) v6, static output, deployed on Cloudflare Pages.

## Dev

```sh
npm install
npm run dev        # localhost:4321
npm run build      # production build → ./dist/
npm run preview    # preview built site locally
```

## Content

Content lives in `src/content/`:

- `essays/` — `.md` files with frontmatter: `title`, `date`, `category`, `epigraph?`, `tags?`, `draft?`
- `stories/` — `.md` files with frontmatter: `title`, `titleNative?`, `date`, `tradition?`, `status`, `inspiredBy?`, `draft?`

Source documents are in `content-source/`. To re-run the migration script:

```sh
node scripts/migrate.mjs
```

Images go in `public/images/essays-assets/` or `public/images/stories-assets/`.

## Deploy (Cloudflare Pages)

1. Connect repo to Cloudflare Pages
2. Build command: `npm run build`
3. Output directory: `dist`
4. Node version: `20` (set via environment variable `NODE_VERSION=20`)

The site is configured for `https://harkhy.ca` in `astro.config.mjs`.

## Structure

```
src/
  content/
    essays/          # 42 essays as .md
    stories/         # 9 stories as .md
  layouts/
    BaseLayout.astro
    EssayLayout.astro
    StoryLayout.astro
  pages/
    index.astro
    essays/[slug].astro
    stories/[slug].astro
    rss.xml.ts
    correspondence.astro
  styles/
    tokens.css       # CSS custom properties, palette, type scale
    global.css       # resets, animations, prose styles
  components/
    Header.astro
    Footer.astro
    Divider.astro
    PostMeta.astro
public/
  favicon.svg        # ح glyph, amber on dark
  og.svg             # Open Graph image
  images/
    essays-assets/
    stories-assets/
scripts/
  migrate.mjs        # splits monolithic .md → individual content files
```
