export function Card({ children, className = '', tone = 'white' }) {
  const tones = {
    white: 'bg-white border border-line shadow-[var(--shadow-card)]',
    brand: 'bg-brand text-white shadow-[var(--shadow-card)]',
    soft: 'bg-brand-light border border-brand/10',
  }
  return (
    <div className={`rounded-[var(--radius-card)] ${tones[tone]} ${className}`}>{children}</div>
  )
}
