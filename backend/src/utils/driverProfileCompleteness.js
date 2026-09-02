const PROFILE_REQUIREMENTS = [
  { key: 'contactEmail', label: 'Email address' },
  { key: 'phone', label: 'Phone number' },
  { key: 'address', label: 'Home address' },
  { key: 'nationalId', label: 'National ID number' },
  { key: 'licenseClass', label: 'Driving licence class' },
  { key: 'licenceExpiry', label: 'Licence expiry date' },
  { key: 'emergencyContact', label: 'Emergency contact name' },
  { key: 'emergencyPhone', label: 'Emergency contact phone' },
  { key: 'document:national_id', label: 'National ID document upload' },
  { key: 'document:driving_license', label: 'Driving licence document upload' },
];

const hasValue = (value) => value !== undefined && value !== null && String(value).trim() !== '';

const getProfileCompleteness = (profile) => {
  const missing = [];

  PROFILE_REQUIREMENTS.forEach((requirement) => {
    if (requirement.key.startsWith('document:')) {
      const docType = requirement.key.split(':')[1];
      const hasDoc = profile.documents?.some((doc) => doc.type === docType);
      if (!hasDoc) missing.push(requirement);
      return;
    }

    if (!hasValue(profile[requirement.key])) {
      missing.push(requirement);
    }
  });

  const total = PROFILE_REQUIREMENTS.length;
  const complete = total - missing.length;

  return {
    percentage: Math.round((complete / total) * 100),
    missingFields: missing.map((item) => item.label),
    missingKeys: missing.map((item) => item.key),
    isComplete: missing.length === 0,
  };
};

module.exports = {
  PROFILE_REQUIREMENTS,
  getProfileCompleteness,
};
