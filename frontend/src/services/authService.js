const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/v1'

export const authService = {
  async register({ name, email, password, role }) {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role }),
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.message || 'Registration failed')
    }
    return data
  },

  async login({ email, password }) {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.message || 'Login failed')
    }
    return data
  },

  async logout(refreshToken) {
    if (!refreshToken) return
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
    } catch (err) {
      console.error('Logout error:', err)
    }
  },

  async refreshTokens(refreshToken) {
    const res = await fetch(`${API_BASE_URL}/auth/refresh-tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.message || 'Token refresh failed')
    }
    return data
  },

  async getMe(token) {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.message || 'Failed to fetch user profile')
    }
    return data
  },
}
