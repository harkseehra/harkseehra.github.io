import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const essays = (await getCollection('essays', e => !e.data.draft))
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

  const stories = (await getCollection('stories', s => !s.data.draft))
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

  const items = [
    ...essays.map(e => ({
      title: e.data.title,
      pubDate: e.data.date,
      description: (e.body ?? '').replace(/[#>*_`\[\]]/g, '').trim().slice(0, 200),
      link: `/essays/${e.id}/`,
      categories: [e.data.category],
    })),
    ...stories.map(s => ({
      title: s.data.title,
      pubDate: s.data.date,
      description: (s.body ?? '').replace(/[#>*_`\[\]]/g, '').trim().slice(0, 200),
      link: `/stories/${s.id}/`,
    })),
  ].sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

  return rss({
    title: 'THE TRUTH · حقیقت',
    description: 'Essays, stories, and philosophical writing by Harkirat Seehra.',
    site: context.site!,
    items,
    customData: `<language>en</language>`,
  });
}
