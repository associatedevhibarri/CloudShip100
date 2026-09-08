/**
 * Build the CloudShip-normalized order shape every adapter must produce.
 * Keeps Woo/Shopify/Wix/Lovable field names out of booking + logistics layers.
 */
const buildNormalizedOrder = ({
  externalOrderId,
  pickup,
  dropoff,
  weightKg,
  cargo,
  buyerEmail,
  buyerPhone,
  currency,
  lineItems,
  raw,
}) => {
  if (!externalOrderId) {
    throw new Error('externalOrderId is required');
  }
  if (!pickup || !dropoff) {
    throw new Error('pickup and dropoff are required');
  }
  const weight = Number(weightKg);
  return {
    externalOrderId: String(externalOrderId),
    pickup: String(pickup).trim(),
    dropoff: String(dropoff).trim(),
    weightKg: Number.isFinite(weight) && weight > 0 ? weight : 1,
    cargo: cargo ? String(cargo).trim() : `Order ${externalOrderId}`,
    buyerEmail: buyerEmail || null,
    buyerPhone: buyerPhone || null,
    currency: (currency || 'ZAR').toUpperCase(),
    lineItems: Array.isArray(lineItems) ? lineItems : [],
    raw: raw || null,
  };
};

const formatAddress = (parts) => {
  if (!parts) return '';
  if (typeof parts === 'string') return parts.trim();
  const bits = [
    parts.address1 || parts.address_1 || parts.line1 || parts.addressLine1,
    parts.address2 || parts.address_2 || parts.line2 || parts.addressLine2,
    parts.city,
    parts.province || parts.state || parts.region,
    parts.postcode || parts.zip || parts.postalCode,
    parts.country || parts.countryCode || parts.country_code,
  ]
    .filter(Boolean)
    .map((s) => String(s).trim());
  return bits.join(', ');
};

const sumWeightKg = (items, getWeight) => {
  if (!Array.isArray(items) || !items.length) return 1;
  const total = items.reduce((sum, item) => {
    const w = Number(getWeight(item));
    const qty = Number(item.quantity != null ? item.quantity : 1) || 1;
    return sum + (Number.isFinite(w) && w > 0 ? w * qty : 0.5 * qty);
  }, 0);
  return total > 0 ? Math.round(total * 1000) / 1000 : 1;
};

module.exports = {
  buildNormalizedOrder,
  formatAddress,
  sumWeightKg,
};
