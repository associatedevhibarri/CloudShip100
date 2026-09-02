const PHONE_REGEX = /^[+]?[\d\s()-]{10,20}$/
const NATIONAL_ID_REGEX = /^[A-Za-z0-9-]{6,30}$/
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

export const DRIVER_PROFILE_FIELDS = {
  contactEmail: {
    label: 'Email address',
    required: true,
  },
  phone: {
    label: 'Phone number',
    required: true,
  },
  address: {
    label: 'Home address',
    required: true,
  },
  nationalId: {
    label: 'National ID number',
    required: true,
  },
  licenseClass: {
    label: 'Driving licence class',
    required: true,
  },
  licenceExpiry: {
    label: 'Licence expiry date',
    required: true,
  },
  emergencyContact: {
    label: 'Emergency contact name',
    required: true,
  },
  emergencyPhone: {
    label: 'Emergency contact phone',
    required: true,
  },
  restrictions: {
    label: 'Restrictions',
    required: false,
  },
}

function validatePhone(value, label, required = true) {
  const trimmed = value?.trim() || ''
  if (!trimmed) return required ? `${label} is required` : null
  if (trimmed.includes('@')) {
    return 'This looks like an email — enter a phone number here (use the Email field for Gmail)'
  }
  if (!PHONE_REGEX.test(trimmed)) return 'Enter a valid phone number (e.g. +27 82 000 0000)'
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length < 10) return 'Phone number must contain at least 10 digits'
  return null
}

function validateNationalId(value) {
  const trimmed = value?.trim() || ''
  if (!trimmed) return 'National ID is required'
  if (!NATIONAL_ID_REGEX.test(trimmed)) {
    return 'Use 6–30 characters (letters, numbers, hyphens only)'
  }
  return null
}

function validateEmail(value) {
  const trimmed = value?.trim() || ''
  if (!trimmed) return 'Email address is required'
  if (/\s/.test(trimmed)) return 'Email address cannot contain spaces'
  if (!trimmed.includes('@')) return 'Email must include @ (e.g. name@gmail.com)'
  if (!EMAIL_REGEX.test(trimmed)) {
    return 'Enter a valid email address (e.g. name@gmail.com)'
  }
  return null
}

function validateEmergencyContact(value) {
  const trimmed = value?.trim() || ''
  if (!trimmed) return 'Emergency contact name is required'
  if (!/^[A-Za-z\s'.-]{2,60}$/.test(trimmed)) {
    return 'Enter a valid contact name (letters only)'
  }
  return null
}

function validateLicenceExpiry(value) {
  if (!value) return 'Licence expiry date is required'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Enter a valid date'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (date < today) return 'Licence appears expired — update or upload a renewed licence'
  return null
}

function validateText(value, label, minLength = 2) {
  const trimmed = value?.trim() || ''
  if (!trimmed) return `${label} is required`
  if (trimmed.length < minLength) return `${label} must be at least ${minLength} characters`
  return null
}

export function validateDriverProfileField(field, value) {
  switch (field) {
    case 'contactEmail':
      return validateEmail(value)
    case 'phone':
      return validatePhone(value, DRIVER_PROFILE_FIELDS.phone.label)
    case 'emergencyPhone':
      return validatePhone(value, DRIVER_PROFILE_FIELDS.emergencyPhone.label)
    case 'address':
      return validateText(value, DRIVER_PROFILE_FIELDS.address.label, 5)
    case 'nationalId':
      return validateNationalId(value)
    case 'licenseClass':
      return validateText(value, DRIVER_PROFILE_FIELDS.licenseClass.label, 2)
    case 'licenceExpiry':
      return validateLicenceExpiry(value)
    case 'emergencyContact':
      return validateEmergencyContact(value)
    case 'restrictions':
      return null
    default:
      return null
  }
}

export function validateDriverProfileForm(form) {
  const errors = {}
  Object.keys(DRIVER_PROFILE_FIELDS).forEach((field) => {
    const message = validateDriverProfileField(field, form[field])
    if (message) errors[field] = message
  })
  return errors
}

export function validateDriverDocument(file) {
  if (!file) return 'Please select a file to upload'
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return 'Only JPG, PNG, WEBP, or PDF files are allowed'
  }
  if (file.size > MAX_FILE_SIZE) return 'File must be 5 MB or smaller'
  return null
}

export function hasValidationErrors(errors) {
  return Object.keys(errors).length > 0
}
