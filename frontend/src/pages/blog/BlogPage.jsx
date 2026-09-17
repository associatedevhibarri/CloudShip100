import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MarketingLayout } from '../../components/layout/MarketingLayout'
import { ErrorState, LoadingState } from '../../components/ui/LoadingState'
import { POSTS_QUERY, sanity, urlFor } from '../../lib/sanity'

const FILLER = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'of',
  'for',
  'in',
  'on',
  'to',
  'with',
  'your',
  'our',
  'by',
  'at',
  'from',
  'into',
  'about',
  'how',
  'why',
  'what',
  'when',
  'this',
  'that',
  'using',
  'use',
  'guide',
  'complete',
  'ultimate',
  'transform',
  'unlock',
  'unlocking',
  'power',
  'need',
  'best',
  'top',
  'new',
  'cloudship',
  'cloud',
  'ship',
  'operations',
  'owners',
  'save',
  'time',
])

function formatWord(word) {
  const lower = word.toLowerCase()
  if (['ai', 'seo', 'crm', 'api', 'erp', 'tms'].includes(lower)) return lower.toUpperCase()
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
}

function listingLabel(post) {
  const source = String(post?.keyword || post?.title || '').trim()
  let tokens = source
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((word) => !FILLER.has(word.toLowerCase()) && !/^20\d{2}$/.test(word))

  const withoutBusiness = tokens.filter((word) => word.toLowerCase() !== 'business')
  if (withoutBusiness.length >= 2) tokens = withoutBusiness

  if (!tokens.length) {
    tokens = source.split(/\s+/).filter(Boolean)
  }

  let picked = tokens.slice(0, 2)
  if (tokens.length > 2 && /^ai$/i.test(tokens[0]) && /agent/i.test(tokens[1])) {
    picked = tokens.slice(-2)
  }
  if (!picked.length) return 'Post'
  return picked.map(formatWord).join(' ')
}

function listingImage(post) {
  const fromMain = urlFor(post?.mainImage)
  if (fromMain) return `${fromMain}?w=800&h=500&fit=crop&auto=format`
  const block = (post?.body || []).find((item) => item?._type === 'image')
  const raw = block?.url || urlFor(block)
  if (!raw) return null
  if (/\/callback\//i.test(raw) || /\/uploads\/generated-images\//i.test(raw)) return null
  return raw.includes('cdn.sanity.io') ? `${raw}?w=800&h=500&fit=crop&auto=format` : raw
}

export default function BlogPage() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    document.title = 'Blog | Cloud Ship'
    return () => {
      document.title = 'Cloud Ship — Logistics ERP'
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    sanity
      .fetch(POSTS_QUERY)
      .then((data) => {
        if (!cancelled) setPosts(data || [])
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Error')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <MarketingLayout>
      <main className="relative mx-auto max-w-6xl px-5 py-12 sm:px-6 sm:py-16">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Blog</h1>

        {loading ? <LoadingState label="Loading…" /> : null}
        {error ? (
          <div className="mt-8">
            <ErrorState message={error} />
          </div>
        ) : null}

        {!loading && !error && posts.length === 0 ? (
          <p className="mt-10 text-sm text-muted">None</p>
        ) : null}

        {!loading && posts.length > 0 ? (
          <ul className="mt-8 grid grid-cols-2 overflow-hidden rounded-xl border border-line bg-white lg:grid-cols-4">
            {posts.map((post) => {
              const slug = post.slug?.current
              const image = listingImage(post)
              const label = listingLabel(post)
              return (
                <li key={slug || post.title} className="min-w-0">
                  <Link
                    to={`/blog/${slug}`}
                    className="group flex h-full flex-col border-r border-b border-line bg-white p-4 transition hover:bg-brand-light/40"
                  >
                    <div className="aspect-[16/10] overflow-hidden rounded-md bg-brand-light">
                      {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : null}
                    </div>
                    <h2 className="mt-3 text-sm font-extrabold leading-snug tracking-tight text-ink group-hover:text-brand sm:text-base">
                      {label}
                    </h2>
                  </Link>
                </li>
              )
            })}
          </ul>
        ) : null}
      </main>
    </MarketingLayout>
  )
}
