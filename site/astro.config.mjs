import { defineConfig } from 'astro/config'
import react from '@astrojs/react'

// SITE_BASE=/ builds for a domain root; override when serving from a subpath.
const base = process.env.SITE_BASE ?? '/'

export default defineConfig({
  site: process.env.SITE_URL ?? 'https://wld-design-plugin.netlify.app',
  ...(base !== '/' && { base }),
  integrations: [react()],
})
