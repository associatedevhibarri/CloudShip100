import { createClient } from '@sanity/client'

const token = import.meta.env.VITE_SANITY_API_TOKEN

export const sanity = createClient({
  projectId: import.meta.env.VITE_SANITY_PROJECT_ID,
  dataset: import.meta.env.VITE_SANITY_DATASET,
  apiVersion: '2021-06-07',
  useCdn: true,
  token: token || undefined,
})

export const POSTS_QUERY = `*[_type == "post" && defined(slug.current)] | order(publishedAt desc) {
  title, slug, excerpt, publishedAt, mainImage, body
}`

export const POST_BY_SLUG_QUERY = `*[_type == "post" && slug.current == $slug][0]{
  title, slug, excerpt, publishedAt, mainImage, body
}`

export function urlFor(source) {
  const ref = source?.asset?._ref
  if (!ref) return null
  const match = ref.match(/^image-(.+)-(\d+x\d+)-(\w+)$/)
  if (!match) return null
  const [, id, dims, format] = match
  const projectId = import.meta.env.VITE_SANITY_PROJECT_ID
  const dataset = import.meta.env.VITE_SANITY_DATASET
  return `https://cdn.sanity.io/images/${projectId}/${dataset}/${id}-${dims}.${format}`
}
