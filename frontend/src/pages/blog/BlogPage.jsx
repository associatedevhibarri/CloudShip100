import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { MarketingLayout } from '../../components/layout/MarketingLayout'
import { ErrorState, LoadingState } from '../../components/ui/LoadingState'
import { POSTS_QUERY, sanity, urlFor } from '../../lib/sanity'

function formatDate(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
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
        if (!cancelled) setError(err.message || 'Could not load posts')
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
        <p className="text-xs font-extrabold uppercase tracking-[0.28em] text-brand">Insights</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Cloud Ship blog</h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">
          Product updates, logistics notes, and stories from the Cloud Ship team.
        </p>

        {loading ? <LoadingState label="Loading posts..." /> : null}
        {error ? (
          <div className="mt-8">
            <ErrorState message={error} />
          </div>
        ) : null}

        {!loading && !error && posts.length === 0 ? (
          <div className="mt-10 rounded-[1.75rem] border border-line bg-white p-8 shadow-[var(--shadow-card)] sm:p-10">
            <h2 className="text-lg font-extrabold text-ink">No posts yet</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
              New articles are on the way. Check back soon.
            </p>
          </div>
        ) : null}

        {!loading && posts.length > 0 ? (
          <ul className="mt-10 grid gap-6 sm:grid-cols-2">
            {posts.map((post) => {
              const slug = post.slug?.current
              const image = urlFor(post.mainImage)
              const date = formatDate(post.publishedAt)
              return (
                <li key={slug || post.title}>
                  <Link
                    to={`/blog/${slug}`}
                    className="group flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-line bg-white shadow-[var(--shadow-card)] transition hover:border-brand/40 hover:shadow-lg"
                  >
                    {image ? (
                      <img
                        src={`${image}?w=900&h=520&fit=crop&auto=format`}
                        alt=""
                        className="h-48 w-full object-cover"
                      />
                    ) : (
                      <div className="h-48 w-full bg-brand-soft-gradient" />
                    )}
                    <div className="flex flex-1 flex-col p-6">
                      {date ? <p className="text-xs font-bold uppercase tracking-wide text-brand">{date}</p> : null}
                      <h2 className="mt-2 text-xl font-extrabold tracking-tight text-ink group-hover:text-brand">
                        {post.title}
                      </h2>
                      {post.excerpt ? (
                        <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{post.excerpt}</p>
                      ) : null}
                      <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-brand">
                        Read post
                        <ArrowRight size={14} />
                      </span>
                    </div>
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
