import { PortableText } from '@portabletext/react'
import { urlFor } from '../../lib/sanity'

const components = {
  types: {
    image: ({ value }) => {
      const src = value?.url || urlFor(value)
      if (!src) return null
      const href = src.startsWith('http') || src.startsWith('/') ? src : `${src}`
      if (/\/callback\//i.test(href) || /\/uploads\/generated-images\//i.test(href)) return null
      return (
        <img
          src={href.includes('cdn.sanity.io') ? `${href}?w=1400&auto=format` : href}
          alt={value.alt || ''}
          className="my-8 w-full rounded-2xl border border-line object-cover"
        />
      )
    },
  },
  block: {
    h1: ({ children }) => <h1 className="mt-10 text-3xl font-extrabold tracking-tight text-ink">{children}</h1>,
    h2: ({ children }) => <h2 className="mt-8 text-2xl font-extrabold tracking-tight text-ink">{children}</h2>,
    h3: ({ children }) => <h3 className="mt-6 text-xl font-bold text-ink">{children}</h3>,
    h4: ({ children }) => <h4 className="mt-5 text-lg font-bold text-ink">{children}</h4>,
    blockquote: ({ children }) => (
      <blockquote className="my-6 border-l-4 border-brand bg-brand-light/40 px-5 py-3 text-ink/90 italic">
        {children}
      </blockquote>
    ),
    normal: ({ children }) => <p className="mt-4 text-base leading-relaxed text-ink/90">{children}</p>,
  },
  list: {
    bullet: ({ children }) => <ul className="mt-4 list-disc space-y-2 pl-6 text-ink/90">{children}</ul>,
    number: ({ children }) => <ol className="mt-4 list-decimal space-y-2 pl-6 text-ink/90">{children}</ol>,
  },
  marks: {
    strong: ({ children }) => <strong className="font-bold text-ink">{children}</strong>,
    em: ({ children }) => <em>{children}</em>,
    underline: ({ children }) => <span className="underline">{children}</span>,
    'strike-through': ({ children }) => <s>{children}</s>,
    code: ({ children }) => (
      <code className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-sm text-ink">{children}</code>
    ),
    link: ({ value, children }) => {
      const href = value?.href || ''
      const external = /^https?:\/\//i.test(href)
      return (
        <a
          href={href}
          className="font-semibold text-brand underline underline-offset-2"
          {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        >
          {children}
        </a>
      )
    },
  },
}

function blockText(block) {
  return (block?.children || []).map((child) => child?.text || '').join('').trim()
}

function withoutDuplicateTitle(value = [], title = '') {
  const blocks = Array.isArray(value) ? [...value] : []
  const expected = String(title || '').trim().toLowerCase()
  if (!blocks.length) return blocks
  const first = blocks[0]
  if (first?.style === 'h1' && expected && blockText(first).toLowerCase() === expected) {
    blocks.shift()
  }
  return blocks
}

export function PortablePostBody({ value, title }) {
  const blocks = withoutDuplicateTitle(value, title)
  if (!blocks.length) return null
  return (
    <div className="max-w-none">
      <PortableText value={blocks} components={components} />
    </div>
  )
}
