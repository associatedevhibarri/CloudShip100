const SPEED = {
  ECONOMY: 'economy',
  STANDARD: 'standard',
  PREMIUM: 'premium',
  ON_DEMAND: 'on_demand',
};

const SPEED_LABEL = {
  economy: 'Economy',
  standard: 'Standard',
  premium: 'Premium',
  on_demand: 'On-demand',
};

const FEDEX_TRANSIT_DAYS = {
  SAME_DAY: 0,
  ONE_DAY: 1,
  TWO_DAYS: 2,
  THREE_DAYS: 3,
  FOUR_DAYS: 4,
  FIVE_DAYS: 5,
  SIX_DAYS: 6,
  SEVEN_DAYS: 7,
  EIGHT_DAYS: 8,
  NINE_DAYS: 9,
  TEN_DAYS: 10,
};

const todayIso = () => new Date().toISOString().slice(0, 10);

const pickupIsoDate = (shipment) => {
  const raw = shipment && shipment.pickupDate;
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(String(raw))) return String(raw);
  return todayIso();
};

const classifySpeed = ({ partnerId, serviceName, serviceCode } = {}) => {
  if (partnerId === 'uber_direct') return SPEED.ON_DEMAND;
  const text = `${serviceName || ''} ${serviceCode || ''}`.toLowerCase();

  if (/same.?day|on.?demand|sameday/.test(text)) return SPEED.ON_DEMAND;
  if (
    /first.?overnight|priority.?overnight|standard.?overnight|express.?9|express.?10|express.?12|9:00|10:30|12:00|overnight|premium|priority|first/.test(
      text
    )
  ) {
    return SPEED.PREMIUM;
  }
  if (/\beco\b|economy|saver|ground|deferred|smartpost|connect.?plus/.test(text)) {
    return SPEED.ECONOMY;
  }
  if (/2.?day|standard|worldwide|express/.test(text)) return SPEED.STANDARD;
  return SPEED.STANDARD;
};

const minutesFromDays = (days) => {
  const n = Number(days);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 24 * 60);
};

const minutesFromMeta = (meta = {}) => {
  if (Number.isFinite(Number(meta.duration)) && Number(meta.duration) > 0) {
    return Number(meta.duration);
  }
  if (Number.isFinite(Number(meta.transitDays)) && Number(meta.transitDays) > 0) {
    return minutesFromDays(meta.transitDays);
  }
  if (meta.transitTime && FEDEX_TRANSIT_DAYS[meta.transitTime] != null) {
    const days = FEDEX_TRANSIT_DAYS[meta.transitTime];
    if (days === 0) return 8 * 60;
    return minutesFromDays(days);
  }
  return null;
};

const transitDaysFromMeta = (meta = {}) => {
  if (meta.transitTime && FEDEX_TRANSIT_DAYS[meta.transitTime] != null) {
    return FEDEX_TRANSIT_DAYS[meta.transitTime];
  }
  if (Number.isFinite(Number(meta.transitDays)) && Number(meta.transitDays) > 0) {
    return Number(meta.transitDays);
  }
  if (Number.isFinite(Number(meta.duration)) && Number(meta.duration) >= 24 * 60) {
    return Math.round(Number(meta.duration) / (24 * 60));
  }
  return null;
};

const normalizeOptions = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.options)) return raw.options;
  return [raw];
};

module.exports = {
  SPEED,
  SPEED_LABEL,
  todayIso,
  pickupIsoDate,
  classifySpeed,
  minutesFromMeta,
  transitDaysFromMeta,
  normalizeOptions,
};
