import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const essays = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/essays' }),
  schema: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    date: z.coerce.date(),
    category: z.enum(['observation', 'philosophy', 'personal', 'satire']),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    epigraph: z.object({
      text: z.string(),
      attribution: z.string().optional(),
    }).optional(),
  }),
});

const stories = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/stories' }),
  schema: z.object({
    title: z.string(),
    titleNative: z.string().optional(),
    date: z.coerce.date(),
    status: z.enum(['complete', 'in-progress']).default('complete'),
    tradition: z.enum(['prophetic', 'sufi', 'original', 'screenplay']).optional(),
    inspiredBy: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

const quotes = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/quotes' }),
  schema: z.object({
    text: z.string(),
    source: z.string().optional(),
    date: z.coerce.date().optional(),
  }),
});

export const collections = { essays, stories, quotes };
