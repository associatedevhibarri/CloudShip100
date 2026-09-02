import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [role, setRole] = useState(
    params.get('role') === 'customer'
      ? 'customer/'
      : params.get('role') === 'driver'
        ? 'driver'
        : 'operator',
  )
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [companyName, setCompanyName] = useState('')
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setIsSubmitting(true)

    try {
      if (mode === 'login') {
        const authenticatedUser = await login(email, password)
        const targetRole = authenticatedUser?.role || role
        navigate(
          targetRole === 'customer'
            ? '/customer/overview'
            : targetRole === 'driver'
              ? '/driver/trips'
              : '/app/dashboard',
        )
      } else {
        const newUser = await register(name, email, password, role, companyName)
        const targetRole = newUser?.role || role
        navigate(
          targetRole === 'customer'
            ? '/customer/overview'
            : targetRole === 'driver'
              ? '/driver/trips'
              : '/app/dashboard',
        )
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials or server connection.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-soft-gradient px-4 py-8">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-[1.5rem] border border-line bg-white shadow-[var(--shadow-card)] md:grid-cols-[0.95fr_1.05fr]">
        {/* Left Hero Panel */}
        <div className="relative hidden flex-col justify-between bg-brand-gradient p-8 text-white md:flex">
          <div className="absolute inset-0 opacity-30 [background:radial-gradient(circle_at_20%_20%,#ffffff55,transparent_45%)]" />
          <div className="relative">
            <Logo variant="brand" />
          </div>
          <div className="relative mt-10">
            <p className="text-xs font-extrabold uppercase tracking-[0.28em] text-white/75">
              Logistics ERP Auth
            </p>
            <h2 className="mt-3 text-3xl font-extrabold leading-tight">
              Mission control for road, air & maritime.
            </h2>
            <p className="mt-3 text-sm text-white/85">
              Real JWT Authentication connected to your CloudShip backend server.
            </p>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="p-8">
          <div className="mb-6 flex justify-center md:justify-start">
            <Logo />
          </div>

          <div className="mb-6 flex border-b border-line">
            <button
              type="button"
              onClick={() => { setMode('login'); setErrorMsg(''); }}
              className={`pb-3 text-sm font-bold transition-colors ${
                mode === 'login'
                  ? 'border-b-2 border-brand text-brand'
                  : 'text-muted hover:text-ink'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setErrorMsg(''); }}
              className={`ml-6 pb-3 text-sm font-bold transition-colors ${
                mode === 'register'
                  ? 'border-b-2 border-brand text-brand'
                  : 'text-muted hover:text-ink'
              }`}
            >
              Create Account
            </button>
          </div>

          <h1 className="text-2xl font-extrabold text-ink">
            {mode === 'login' ? 'Sign in to Cloud Ship' : 'Create your Cloud Ship Account'}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {mode === 'login'
              ? 'Enter your registered credentials to access your dashboard.'
              : 'Sign up to manage logistics orders, fleets, and portals.'}
          </p>

          {errorMsg && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-600">
              {errorMsg}
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {mode === 'register' && (
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">
                Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
              {mode === 'register' && (
                <p className="mt-1 text-[11px] text-muted">
                  Must be at least 8 characters with 1 letter and 1 number.
                </p>
              )}
            </div>

            {mode === 'register' && (
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">
                  Account Role
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {[
                    { id: 'operator', label: 'Ops / Logistics Operator' },
                    { id: 'customer', label: 'Customer / Buyer Portal' },
                    { id: 'driver', label: 'Driver Portal' },
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRole(r.id)}
                      className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
                        role === r.id
                          ? 'border-brand bg-brand-gradient text-white shadow-sm'
                          : 'border-line bg-surface text-ink'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mode === 'register' && role === 'customer' && (
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">
                  Company Name
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. AfriMetals Pty"
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
                <p className="mt-1 text-[11px] text-muted">
                  Used to verify your business and issue invoices, contracts, and compliance documents.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full bg-brand-gradient py-3 text-sm font-bold text-white shadow-md shadow-brand/20 hover:brightness-105 disabled:opacity-50"
            >
              {isSubmitting
                ? 'Authenticating...'
                : mode === 'login'
                ? 'Sign In'
                : 'Create Account'}
            </button>
          </form>

          {mode === 'login' ? (
            <button
              type="button"
              onClick={() => {
                localStorage.setItem(
                  'cloudship_user',
                  JSON.stringify({
                    name: 'Ops Manager',
                    email: 'ops@cloudship.demo',
                    role: 'operator',
                  }),
                )
                localStorage.setItem(
                  'cloudship_tokens',
                  JSON.stringify({
                    access: { token: 'demo-operator' },
                    refresh: { token: 'demo-operator' },
                  }),
                )
                window.location.assign('/app/warehouse')
              }}
              className="mt-3 w-full rounded-full border border-line bg-white py-3 text-sm font-bold text-ink hover:border-brand"
            >
              Open warehouse demo (no server)
            </button>
          ) : null}

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
