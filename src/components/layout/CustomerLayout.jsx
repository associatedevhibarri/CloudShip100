import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Logo } from '../Logo'
import { useAuth } from '../../context/AuthContext'

export function CustomerLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <Logo />
          <nav className="flex items-center gap-2 text-sm font-semibold">
            <NavLink
              to="/customer/account"
              className={({ isActive }) =>
                `rounded-full px-3 py-1.5 ${isActive ? 'bg-brand text-white' : 'text-muted hover:bg-brand-light'}`
              }
            >
              Account
            </NavLink>
            <NavLink
              to="/customer/deliveries"
              className={({ isActive }) =>
                `rounded-full px-3 py-1.5 ${isActive ? 'bg-brand text-white' : 'text-muted hover:bg-brand-light'}`
              }
            >
              Deliveries
            </NavLink>
            <button
              type="button"
              className="rounded-full px-3 py-1.5 text-muted hover:bg-surface"
              onClick={() => {
                logout()
                navigate('/login')
              }}
            >
              Sign out
            </button>
          </nav>
        </div>
        {user ? (
          <div className="border-t border-line bg-brand-light/40 px-4 py-2 text-center text-xs font-semibold text-brand-dark">
            Signed in as {user.name} · {user.email}
          </div>
        ) : null}
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
