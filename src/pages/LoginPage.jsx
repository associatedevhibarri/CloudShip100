import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { useAuth } from '../context/AuthContext'
import { useState } from 'react'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [role, setRole] = useState(params.get('role') === 'customer' ? 'customer' : 'operator')
  const [name, setName] = useState('')

  const onSubmit = (e) => {
    e.preventDefault()
    login(role, name || undefined)
    navigate(role === 'customer' ? '/customer/deliveries' : '/app/dashboard')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-soft-gradient px-4 py-8">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-[1.5rem] border border-line bg-white shadow-[var(--shadow-card)] md:grid-cols-[0.95fr_1.05fr]">
        <div className="relative hidden flex-col justify-between bg-brand-gradient p-8 text-white md:flex">
          <div className="absolute inset-0 opacity-30 [background:radial-gradient(circle_at_20%_20%,#ffffff55,transparent_45%)]" />
          <div className="relative">
            <Logo variant="brand" />
          </div>
          <div className="relative mt-10">
            <p className="text-xs font-extrabold uppercase tracking-[0.28em] text-white/75">
              Logistics ERP
            </p>
            <h2 className="mt-3 text-3xl font-extrabold leading-tight">
              Mission control for road, air & maritime.
            </h2>
            <p className="mt-3 text-sm text-white/85">
              Demo frontend with live-looking ops data — pick a role and explore.
            </p>
          </div>
        </div>

        <div className="p-8">
          <div className="mb-6 flex justify-center md:justify-start">
            <Logo />
          </div>
          <h1 className="text-2xl font-extrabold text-ink">Sign in to Cloud Ship</h1>
          <p className="mt-2 text-sm text-muted">Demo auth — pick a role and continue.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">
                Role
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['operator', 'customer'].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-semibold capitalize ${
                      role === r
                        ? 'border-brand bg-brand-gradient text-white'
                        : 'border-line bg-surface text-ink'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">
                Display name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={role === 'operator' ? 'Ops Manager' : 'AfriMetals Buyer'}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-full bg-brand-gradient py-3 text-sm font-bold text-white shadow-md shadow-brand/20 hover:brightness-105"
            >
              Enter {role === 'operator' ? 'ERP' : 'portal'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted md:text-left">
            <Link to="/" className="font-semibold text-brand">
              Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
