import { createClient } from '@sanity/client'

const projectId = import.meta.env.VITE_SANITY_PROJECT_ID || '9qgk0vl9'
const dataset = import.meta.env.VITE_SANITY_DATASET || 'production'
const token = import.meta.env.VITE_SANITY_API_TOKEN

export const sanity = projectId
  ? createClient({
      projectId,
      dataset,
      apiVersion: '2021-06-07',
      useCdn: true,
      token: token || undefined,
    })
  : {
      fetch: () =>
        Promise.reject(new Error('Sanity is not configured. Set VITE_SANITY_PROJECT_ID in frontend/.env')),
    }

export const POSTS_QUERY = `*[_type in ["post", "page"] && defined(slug.current)] | order(publishedAt desc) {
  title, slug, excerpt, keyword, publishedAt, mainImage, body
}`

export const POST_BY_SLUG_QUERY = `*[_type in ["post", "page"] && slug.current == $slug][0]{
  title, slug, excerpt, keyword, publishedAt, mainImage, body
}`

export function urlFor(source) {
  const ref = source?.asset?._ref
  if (!ref || !projectId || !dataset) return null
  const match = ref.match(/^image-(.+)-(\d+x\d+)-(\w+)$/)
  if (!match) return null
  const [, id, dims, format] = match
  return `https://cdn.sanity.io/images/${projectId}/${dataset}/${id}-${dims}.${format}`
}
