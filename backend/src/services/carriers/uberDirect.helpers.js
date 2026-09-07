const { parseAddress } = require('./address');
const { pickupIsoDate, todayIso } = require('./speed');

const ZA_CITY_PROVINCE = {
  johannesburg: 'GP',
  sandton: 'GP',
  braamfontein: 'GP',
  rosebank: 'GP',
  randburg: 'GP',
  midrand: 'GP',
  pretoria: 'GP',
  soweto: 'GP',
  'cape town': 'WC',
  durban: 'KZN',
};

const DEFAULT_PHONE = {
  ZA: '+27821234567',
  US: '+12065551212',
  GB: '+442071838750',
  CA: '+14165550100',
};

const provinceFor = (parsed) => {
  if (parsed.state) return parsed.state;
  if (parsed.countryCode === 'ZA') {
    return ZA_CITY_PROVINCE[String(parsed.city || '').toLowerCase()] || '';
  }
  return '';
};

const structuredAddress = (raw) => {
  const parsed = parseAddress(raw);
  return JSON.stringify({
    street_address: [parsed.street],
    city: parsed.city,
    state: provinceFor(parsed),
    zip_code: parsed.postalCode,
    country: parsed.countryCode,
  });
};

const toE164 = (raw, countryCode = 'ZA') => {
  const fallback = DEFAULT_PHONE[countryCode] || DEFAULT_PHONE.ZA;
  const trimmed = String(raw || '').trim();
  const digits = trimmed.replace(/\D/g, '');
  if (!digits || /^0+$/.test(digits)) return fallback;

  if (trimmed.startsWith('+') && digits.length >= 10) return `+${digits}`;
  if (digits.startsWith('00') && digits.length >= 12) return `+${digits.slice(2)}`;

  if (countryCode === 'ZA') {
    if (digits.startsWith('27') && digits.length >= 11) return `+${digits}`;
    if (digits.startsWith('0') && digits.length === 10) return `+27${digits.slice(1)}`;
    if (digits.length === 9) return `+27${digits}`;
  }
  if (countryCode === 'US' || countryCode === 'CA') {
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
    if (digits.length === 10) return `+1${digits}`;
  }
  if (digits.length >= 10) return `+${digits}`;
  return fallback;
};

const phoneFor = (raw, address) => toE164(raw, parseAddress(address).countryCode);

const scheduleWindow = (shipment) => {
  const date = pickupIsoDate(shipment);
  if (date <= todayIso()) return {};
  return {
    pickup_ready_dt: `${date}T08:00:00.000Z`,
    pickup_deadline_dt: `${date}T09:00:00.000Z`,
    dropoff_ready_dt: `${date}T08:30:00.000Z`,
    dropoff_deadline_dt: `${date}T12:30:00.000Z`,
  };
};

const scheduleFromQuote = (shipment, partnerQuote) => {
  const meta = (partnerQuote && partnerQuote.meta) || {};
  if (meta.pickupReadyDt) {
    const window = {
      pickup_ready_dt: meta.pickupReadyDt,
      dropoff_ready_dt: meta.dropoffReadyDt,
    };
    if (meta.pickupDeadlineDt) window.pickup_deadline_dt = meta.pickupDeadlineDt;
    if (meta.dropoffDeadlineDt) window.dropoff_deadline_dt = meta.dropoffDeadlineDt;
    return window;
  }
  return scheduleWindow(shipment);
};

module.exports = {
  structuredAddress,
  toE164,
  phoneFor,
  scheduleWindow,
  scheduleFromQuote,
};
