const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/v1'
const API_ORIGIN = API_BASE_URL.replace(/\/v1\/?$/, '')

async function parseResponse(res) {
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.message || 'Request failed')
  }
  return data
}

function authHeaders(token, json = true) {
  const headers = { Authorization: `Bearer ${token}` }
  if (json) headers['Content-Type'] = 'application/json'
  return headers
}

export function getDocumentUrl(relativePath) {
  if (!relativePath) return null
  if (relativePath.startsWith('http')) return relativePath
  return `${API_ORIGIN}${relativePath}`
}

export const driverService = {
  async getProfile(token) {
    const res = await fetch(`${API_BASE_URL}/drivers/me/profile`, {
      headers: authHeaders(token),
    })
    return parseResponse(res)
  },

  async updateProfile(token, payload) {
    const res = await fetch(`${API_BASE_URL}/drivers/me/profile`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    })
    return parseResponse(res)
  },

  async getDashboard(token) {
    const res = await fetch(`${API_BASE_URL}/drivers/me/dashboard`, {
      headers: authHeaders(token),
    })
    return parseResponse(res)
  },

  async getTrips(token, bucket) {
    const query = bucket ? `?bucket=${encodeURIComponent(bucket)}` : ''
    const res = await fetch(`${API_BASE_URL}/drivers/me/trips${query}`, {
      headers: authHeaders(token),
    })
    return parseResponse(res)
  },

  async getParcels(token, status) {
    const query = status ? `?status=${encodeURIComponent(status)}` : ''
    const res = await fetch(`${API_BASE_URL}/drivers/me/parcels${query}`, {
      headers: authHeaders(token),
    })
    return parseResponse(res)
  },

  async updateParcelStatus(token, parcelCode, status) {
    const res = await fetch(`${API_BASE_URL}/drivers/me/parcels/${encodeURIComponent(parcelCode)}/status`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify({ status }),
    })
    return parseResponse(res)
  },

  async getDamageLogs(token) {
    const res = await fetch(`${API_BASE_URL}/drivers/me/damage-logs`, {
      headers: authHeaders(token),
    })
    return parseResponse(res)
  },

  async createDamageLog(token, payload) {
    const res = await fetch(`${API_BASE_URL}/drivers/me/damage-logs`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    })
    return parseResponse(res)
  },

  async getHistory(token) {
    const res = await fetch(`${API_BASE_URL}/drivers/me/history`, {
      headers: authHeaders(token),
    })
    return parseResponse(res)
  },

  async uploadDocument(token, file, type) {
    const formData = new FormData()
    formData.append('document', file)
    formData.append('type', type)

    const res = await fetch(`${API_BASE_URL}/drivers/me/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })
    return parseResponse(res)
  },

  async deleteDocument(token, documentId) {
    const res = await fetch(`${API_BASE_URL}/drivers/me/documents/${documentId}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    })
    return parseResponse(res)
  },
}
