import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/posts' }),
  schema: z.object({
    id: z.number(),
    slug: z.string(),
    title: z.string(),
    date: z.string(),
    modified: z.string().optional(),
    excerpt: z.string(),
    image: z.string().nullable().optional(),
    imageAlt: z.string().default(''),
    category: z.string().default('infos'),
    tags: z.array(z.string()).default([]),
    html: z.string(),
    readingTime: z.number().default(6),
    faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
    regenerated: z.boolean().default(false),
  }),
});

export const collections = { posts };
