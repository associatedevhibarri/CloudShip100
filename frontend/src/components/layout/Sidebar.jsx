import { NavLink, useLocation } from 'react-router-dom'
import { ChevronDown, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { operatorNav } from '../../navigation/nav'
import { Logo } from '../Logo'

function NavItem({ item, onNavigate }) {
  const location = useLocation()
  const [open, setOpen] = useState(
    item.children?.some((c) => c.path && location.pathname.startsWith(c.path)) ?? false,
  )

  if (item.children) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-ink hover:bg-brand-light"
        >
          <span className="flex items-center gap-2">
            {item.icon ? <item.icon size={18} className="text-brand" /> : null}
            {item.label}
          </span>
          <ChevronDown size={16} className={`transition ${open ? 'rotate-180' : ''}`} />
        </button>
        {open ? (
          <div className="ml-3 space-y-1 border-l border-line pl-3">
            {item.children.map((child) =>
              child.section ? (
                <p
                  key={child.section}
                  className="px-3 pb-1 pt-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-brand"
                >
                  {child.section}
                </p>
              ) : (
                <NavLink
                  key={child.path}
                  to={child.path}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `block rounded-lg px-3 py-2 text-sm ${
                      isActive ? 'bg-brand text-white' : 'text-muted hover:bg-brand-light hover:text-brand'
                    }`
                  }
                >
                  {child.label}
                </NavLink>
              ),
            )}
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <NavLink
      to={item.path}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold ${
          isActive ? 'bg-brand text-white' : 'text-ink hover:bg-brand-light'
        }`
      }
    >
      {item.icon ? <item.icon size={18} /> : null}
      {item.label}
    </NavLink>
  )
}

export function Sidebar({ open, onClose, nav = operatorNav }) {
  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-ink/30 backdrop-blur-sm lg:hidden ${open ? '' : 'hidden'}`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-line bg-white p-4 transition lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-6 flex items-center justify-between">
          <Logo size="lg" />
          <button type="button" className="rounded-lg p-2 hover:bg-surface lg:hidden" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
          {nav.map((item) => (
            <NavItem key={item.label} item={item} onNavigate={onClose} />
          ))}
        </nav>
      </aside>
    </>
  )
}

export function MobileMenuButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-line bg-white p-2 shadow-sm lg:hidden"
    >
      <Menu size={18} />
    </button>
  )
}
