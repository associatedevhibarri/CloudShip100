const COUNTRY_ALIASES = {
  'south africa': 'ZA',
  za: 'ZA',
  rsa: 'ZA',
  'united states': 'US',
  usa: 'US',
  us: 'US',
  'united kingdom': 'GB',
  uk: 'GB',
  gb: 'GB',
  germany: 'DE',
  de: 'DE',
  netherlands: 'NL',
  nl: 'NL',
};

const parseAddress = (raw, fallbackCountry = 'ZA') => {
  const text = String(raw || '').trim();
  const parts = text
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  let countryCode = fallbackCountry;
  const last = (parts[parts.length - 1] || '').toLowerCase();
  if (COUNTRY_ALIASES[last]) {
    countryCode = COUNTRY_ALIASES[last];
    parts.pop();
  }

  const postalMatch = text.match(/\b(\d{4,6})\b/);
  let postalCode = '00000';
  if (postalMatch) {
    const [, matchedPostal] = postalMatch;
    postalCode = matchedPostal;
  } else if (countryCode === 'ZA') {
    postalCode = '0001';
  }

  let state = '';
  if (parts.length) {
    const tail = parts[parts.length - 1];
    const stateZip = tail.match(/^([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/);
    if (stateZip) {
      state = stateZip[1].toUpperCase();
      postalCode = stateZip[2];
      parts.pop();
    } else if (/^\d{4,6}$/.test(tail)) {
      postalCode = tail;
      parts.pop();
    }
  }

  const city = parts.length > 1 ? parts[parts.length - 1] : parts[0] || 'Unknown';
  const street = parts.length > 1 ? parts.slice(0, -1).join(', ') : parts[0] || text || 'Unknown';

  return {
    raw: text,
    street,
    city,
    state,
    postalCode,
    countryCode,
    company: '',
  };
};

const defaultParcel = ({ weightKg, lengthCm, widthCm, heightCm }) => ({
  weightKg: Number(weightKg) || 1,
  lengthCm: Number(lengthCm) || 20,
  widthCm: Number(widthCm) || 20,
  heightCm: Number(heightCm) || 20,
});

module.exports = {
  parseAddress,
  defaultParcel,
};
