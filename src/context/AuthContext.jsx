import { createContext, useContext, useMemo, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('cloudship_user')
    return raw ? JSON.parse(raw) : null
  })

  const value = useMemo(
    () => ({
      user,
      login: (role, name) => {
        const next = {
          role,
          name: name || (role === 'operator' ? 'Ops Manager' : 'AfriMetals Buyer'),
          email: role === 'operator' ? 'ops@cloudship.demo' : 'ops@afrimetals.demo',
        }
        localStorage.setItem('cloudship_user', JSON.stringify(next))
        setUser(next)
        return next
      },
      logout: () => {
        localStorage.removeItem('cloudship_user')
        setUser(null)
      },
    }),
    [user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
