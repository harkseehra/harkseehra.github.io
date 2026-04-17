// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import remarkSmartypants from 'remark-smartypants';

export default defineConfig({
  site: 'https://harkseehra.github.io',
  integrations: [mdx(), sitemap()],
  markdown: {
    rehypePlugins: [rehypeSlug, rehypeAutolinkHeadings],
    remarkPlugins: [remarkSmartypants],
  },
});
