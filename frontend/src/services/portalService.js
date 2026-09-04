const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/v1'
const API_ORIGIN = API_BASE_URL.replace(/\/v1$/, '')

async function request(path, { token, method = 'GET', body } = {}) {
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  })
  if (res.status === 204) return null
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.message || 'Request failed')
  }
  return data
}

export const portalService = {
  getMyCompany: (token) => request('/companies/me', { token }),
  updateMyCompany: (token, body) => request('/companies/me', { token, method: 'PATCH', body }),
  getMyBookings: (token) => request('/bookings/mine', { token }),
  createBooking: (token, body) => request('/bookings', { token, method: 'POST', body }),
  getMyInvoices: (token) => request('/invoices/mine', { token }),
  getMyContracts: (token) => request('/contracts/mine', { token }),
  signContract: (token, id) => request(`/contracts/${id}/sign`, { token, method: 'PATCH' }),
  getMyKycDocuments: (token) => request('/kyc-documents/mine', { token }),
  uploadKycDocument: (token, formData) => request('/kyc-documents/mine', { token, method: 'POST', body: formData }),
  getMyPaymentRequests: (token) => request('/payment-requests/mine', { token }),
  payPaymentRequest: (token, id) => request(`/payment-requests/${id}/pay`, { token, method: 'PATCH' }),
  getMyNotifications: (token) => request('/notifications/mine', { token }),
  getPromotions: (token) => request('/promotions', { token }),
  createPromotion: (token, body) => request('/promotions', { token, method: 'POST', body }),
  getQuote: (body) => request('/pricing/quote', { method: 'POST', body }),
  submitLead: (body) => request('/leads', { method: 'POST', body }),
  resolveFileUrl: (relativeUrl) => (relativeUrl ? `${API_ORIGIN}${relativeUrl}` : null),
}
