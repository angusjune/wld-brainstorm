import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders'

const skills = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/skills' }),
  schema: z.object({
    name: z.string(),
    tagline: z.string(),
    stage: z.enum(['发散', '交付', '质检', '彩蛋']),
    order: z.number(),
    prompt: z.string(),
    deps: z.array(z.string()).default([]),
    demo: z.enum(['screens', 'arena', 'none']).default('none'),
    demoScreens: z.array(z.string()).default([]),
  }),
})

export const collections = { skills }
