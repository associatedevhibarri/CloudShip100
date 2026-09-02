import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { authService } from '../../services/authService'

const initialUser = (() => {
  const raw = localStorage.getItem('cloudship_user')
  return raw ? JSON.parse(raw) : null
})()

const initialTokens = (() => {
  const raw = localStorage.getItem('cloudship_tokens')
  return raw ? JSON.parse(raw) : null
})()

export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const data = await authService.login({ email, password })
      localStorage.setItem('cloudship_user', JSON.stringify(data.user))
      localStorage.setItem('cloudship_tokens', JSON.stringify(data.tokens))
      return data
    } catch (err) {
      return rejectWithValue(err.message || 'Login failed')
    }
  }
)

export const registerUser = createAsyncThunk(
  'auth/register',
  async ({ name, email, password, role, companyName }, { rejectWithValue }) => {
    try {
      const data = await authService.register({ name, email, password, role, companyName })
      localStorage.setItem('cloudship_user', JSON.stringify(data.user))
      localStorage.setItem('cloudship_tokens', JSON.stringify(data.tokens))
      return data
    } catch (err) {
      return rejectWithValue(err.message || 'Registration failed')
    }
  }
)

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { getState }) => {
    const { auth } = getState()
    if (auth.tokens?.refresh?.token) {
      await authService.logout(auth.tokens.refresh.token)
    }
    localStorage.removeItem('cloudship_user')
    localStorage.removeItem('cloudship_tokens')
  }
)

export const fetchCurrentUser = createAsyncThunk(
  'auth/fetchCurrentUser',
  async (_, { getState, rejectWithValue }) => {
    const { auth } = getState()
    const tokens = auth.tokens

    if (!tokens?.access?.token) {
      return null
    }

    try {
      const currentUser = await authService.getMe(tokens.access.token)
      localStorage.setItem('cloudship_user', JSON.stringify(currentUser))
      return { user: currentUser, tokens }
    } catch {
      // Attempt token refresh
      if (tokens?.refresh?.token) {
        try {
          const newTokens = await authService.refreshTokens(tokens.refresh.token)
          const currentUser = await authService.getMe(newTokens.access.token)

          localStorage.setItem('cloudship_tokens', JSON.stringify(newTokens))
          localStorage.setItem('cloudship_user', JSON.stringify(currentUser))
          return { user: currentUser, tokens: newTokens }
        } catch (refreshErr) {
          localStorage.removeItem('cloudship_user')
          localStorage.removeItem('cloudship_tokens')
          return rejectWithValue(refreshErr.message || 'Session expired')
        }
      }
      localStorage.removeItem('cloudship_user')
      localStorage.removeItem('cloudship_tokens')
      return rejectWithValue('Session expired')
    }
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: initialUser,
    tokens: initialTokens,
    loading: true,
    error: null,
  },
  reducers: {
    clearAuthError: (state) => {
      state.error = null
    },
    setCredentials: (state, action) => {
      state.user = action.payload.user
      state.tokens = action.payload.tokens
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false
        state.user = action.payload.user
        state.tokens = action.payload.tokens
        state.error = null
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // Register
      .addCase(registerUser.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false
        state.user = action.payload.user
        state.tokens = action.payload.tokens
        state.error = null
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // Logout
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null
        state.tokens = null
        state.loading = false
        state.error = null
      })
      // Fetch Current User
      .addCase(fetchCurrentUser.pending, (state) => {
        state.loading = true
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.loading = false
        if (action.payload) {
          state.user = action.payload.user
          state.tokens = action.payload.tokens
        } else {
          state.user = null
          state.tokens = null
        }
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.loading = false
        state.user = null
        state.tokens = null
      })
  },
})

export const { clearAuthError, setCredentials } = authSlice.actions
export default authSlice.reducer
