import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { PortablePostBody } from '../../components/blog/PortablePostBody'
import { MarketingLayout } from '../../components/layout/MarketingLayout'
import { ErrorState, LoadingState } from '../../components/ui/LoadingState'
import { POST_BY_SLUG_QUERY, sanity, urlFor } from '../../lib/sanity'

function formatDate(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function BlogPostPage() {
  const { slug } = useParams()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    sanity
      .fetch(POST_BY_SLUG_QUERY, { slug })
      .then((data) => {
        if (cancelled) return
        setPost(data)
        document.title = data?.title ? `${data.title} | Cloud Ship` : 'Blog | Cloud Ship'
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Could not load this post')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
      document.title = 'Cloud Ship — Logistics ERP'
    }
  }, [slug])

  const image = urlFor(post?.mainImage)
  const date = formatDate(post?.publishedAt)

  return (
    <MarketingLayout>
      <main className="relative mx-auto max-w-3xl px-5 py-12 sm:px-6 sm:py-16">
        <Link
          to="/blog"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand transition hover:underline"
        >
          <ArrowLeft size={14} />
          Blog
        </Link>

        {loading ? <LoadingState label="Loading…" /> : null}
        {error ? (
          <div className="mt-8">
            <ErrorState message={error} />
          </div>
        ) : null}

        {!loading && !error && !post ? (
          <div className="mt-10 rounded-[1.75rem] border border-line bg-white p-8 shadow-[var(--shadow-card)]">
            <h1 className="text-2xl font-extrabold text-ink">Post not found</h1>
            <p className="mt-2 text-sm text-muted">That article is not published, or the link is incorrect.</p>
          </div>
        ) : null}

        {post ? (
          <article className="mt-8">
            {date ? <p className="text-xs font-bold uppercase tracking-wide text-brand">{date}</p> : null}
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{post.title}</h1>
            {image ? (
              <img
                src={`${image}?w=1400&auto=format`}
                alt=""
                className="mt-8 w-full rounded-[1.75rem] border border-line object-cover"
              />
            ) : null}
            <div className="mt-8">
              <PortablePostBody value={post.body} title={post.title} />
            </div>
          </article>
        ) : null}
      </main>
    </MarketingLayout>
  )
}
