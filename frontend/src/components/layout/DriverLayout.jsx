import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Logo } from '../Logo'
import { useAuth } from '../../context/AuthContext'
import { driverNav } from '../../navigation/driverNav'

export function DriverLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-surface pb-20 md:pb-0">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <Logo />
          <nav className="hidden items-center gap-2 text-sm font-semibold md:flex">
            {driverNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-full px-3 py-1.5 ${isActive ? 'bg-brand text-white' : 'text-muted hover:bg-brand-light'}`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <button
              type="button"
              className="rounded-full px-3 py-1.5 text-muted hover:bg-surface"
              onClick={handleSignOut}
            >
              Sign out
            </button>
          </nav>
        </div>
        {user ? (
          <div className="border-t border-line bg-brand-light/40 px-4 py-2 text-center text-xs font-semibold text-brand-dark">
            Driver · {user.name} · {user.email}
          </div>
        ) : null}
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 md:py-8">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white md:hidden">
        <div className="mx-auto flex max-w-5xl items-stretch justify-around">
          {driverNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 px-1 py-2.5 text-[10px] font-bold uppercase tracking-wide ${
                  isActive ? 'text-brand' : 'text-muted'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`h-1 w-8 rounded-full ${isActive ? 'bg-brand' : 'bg-transparent'}`} />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
