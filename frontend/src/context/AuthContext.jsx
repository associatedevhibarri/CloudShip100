import { createContext, useContext, useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  loginUser,
  registerUser,
  logoutUser,
  fetchCurrentUser,
  clearAuthError,
} from '../store/slices/authSlice'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const dispatch = useDispatch()
  const { user, tokens, loading, error } = useSelector((state) => state.auth)

  useEffect(() => {
    dispatch(fetchCurrentUser())
  }, [dispatch])

  const login = async (email, password) => {
    const resultAction = await dispatch(loginUser({ email, password }))
    if (loginUser.fulfilled.match(resultAction)) {
      return resultAction.payload.user
    } else {
      throw new Error(resultAction.payload || 'Login failed')
    }
  }

  const register = async (name, email, password, role) => {
    const resultAction = await dispatch(registerUser({ name, email, password, role }))
    if (registerUser.fulfilled.match(resultAction)) {
      return resultAction.payload.user
    } else {
      throw new Error(resultAction.payload || 'Registration failed')
    }
  }

  const logout = async () => {
    await dispatch(logoutUser())
  }

  const clearError = () => {
    dispatch(clearAuthError())
  }

  const value = useMemo(
    () => ({
      user,
      tokens,
      loading,
      error,
      login,
      register,
      logout,
      clearError,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, tokens, loading, error],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
