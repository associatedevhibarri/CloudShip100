const PHONE_REGEX = /^[+]?[\d\s()-]{10,20}$/;
const NATIONAL_ID_REGEX = /^[A-Za-z0-9-]{6,30}$/;
const NAME_REGEX = /^[A-Za-z\s'.-]{2,60}$/;
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const hasValue = (value) => value !== undefined && value !== null && String(value).trim() !== '';

const validateEmail = (value) => {
  if (!hasValue(value)) return 'Email address is required';
  const trimmed = String(value).trim();
  if (/\s/.test(trimmed)) return 'Email address cannot contain spaces';
  if (!trimmed.includes('@')) return 'Email must include @ (e.g. name@gmail.com)';
  if (!EMAIL_REGEX.test(trimmed)) return 'Enter a valid email address (e.g. name@gmail.com)';
  return null;
};

const validatePhone = (value, label) => {
  if (!hasValue(value)) return `${label} is required`;
  const trimmed = String(value).trim();
  if (trimmed.includes('@')) {
    return 'This looks like an email — enter a phone number here (use the Email field for Gmail)';
  }
  if (!PHONE_REGEX.test(String(value).trim())) {
    return 'Enter a valid phone number (e.g. +27 82 000 0000)';
  }
  const digits = String(value).replace(/\D/g, '');
  if (digits.length < 10) return 'Phone number must contain at least 10 digits';
  return null;
};

const validateNationalId = (value) => {
  if (!hasValue(value)) return 'National ID is required';
  if (!NATIONAL_ID_REGEX.test(String(value).trim())) {
    return 'Use 6–30 characters (letters, numbers, hyphens only)';
  }
  return null;
};

const validateLicenceExpiry = (value) => {
  if (!value) return 'Licence expiry date is required';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Enter a valid date';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date < today) return 'Licence appears expired — update or upload a renewed licence';
  return null;
};

const validateText = (value, label, minLength = 2) => {
  if (!hasValue(value)) return `${label} is required`;
  if (String(value).trim().length < minLength) {
    return `${label} must be at least ${minLength} characters`;
  }
  return null;
};

const validateEmergencyContact = (value) => {
  if (!hasValue(value)) return 'Emergency contact name is required';
  if (!NAME_REGEX.test(String(value).trim())) {
    return 'Enter a valid contact name (letters only)';
  }
  return null;
};

const FIELD_VALIDATORS = {
  contactEmail: validateEmail,
  phone: (value) => validatePhone(value, 'Phone number'),
  address: (value) => validateText(value, 'Home address', 5),
  nationalId: validateNationalId,
  licenseClass: (value) => validateText(value, 'Driving licence class', 2),
  licenceExpiry: validateLicenceExpiry,
  emergencyContact: validateEmergencyContact,
  emergencyPhone: (value) => validatePhone(value, 'Emergency contact phone'),
  restrictions: () => null,
  assignedVehicle: () => null,
};

const validateProfileField = (field, value) => {
  const validator = FIELD_VALIDATORS[field];
  return validator ? validator(value) : null;
};

const validateProfilePayload = (payload, { partial = false } = {}) => {
  const errors = {};

  Object.keys(payload).forEach((field) => {
    if (!FIELD_VALIDATORS[field]) return;
    const message = validateProfileField(field, payload[field]);
    if (message) errors[field] = message;
  });

  if (!partial) {
    [
      'contactEmail',
      'phone',
      'address',
      'nationalId',
      'licenseClass',
      'licenceExpiry',
      'emergencyContact',
      'emergencyPhone',
    ].forEach((field) => {
      if (!(field in payload)) {
        errors[field] = validateProfileField(field, payload[field]);
      }
    });
  }

  return errors;
};

module.exports = {
  validateProfileField,
  validateProfilePayload,
  hasValidationErrors: (errors) => Object.keys(errors).length > 0,
};
