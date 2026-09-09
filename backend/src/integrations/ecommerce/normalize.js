const toMoney = (value) => {
  if (value == null || value === '') return null;
  if (typeof value === 'object') {
    return toMoney(value.amount ?? value.value ?? value.price ?? value.total ?? value.formatted);
  }
  const n = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
};

const lineItemName = (item) => {
  if (!item) return 'Item';
  if (item.name || item.title) return String(item.name || item.title);
  const product = item.productName;
  if (product && typeof product === 'object') return String(product.original || product.translated || 'Item');
  if (product) return String(product);
  return 'Item';
};

const compactLineItems = (items) => {
  if (!Array.isArray(items)) return [];
  return items.slice(0, 40).map((item) => {
    const qty = Number(item.quantity != null ? item.quantity : 1) || 1;
    const lineTotal = toMoney(item.total ?? item.line_total ?? item.price_incl_tax);
    const unit = toMoney(item.price ?? item.unitPrice ?? (item.priceInfo && item.priceInfo.price));
    const total = lineTotal != null ? lineTotal : unit != null ? Math.round(unit * qty * 100) / 100 : null;
    return { name: lineItemName(item), quantity: qty, total };
  });
};

const sumLineTotals = (items) => {
  const rows = compactLineItems(items);
  if (!rows.length || rows.every((row) => row.total == null)) return null;
  return Math.round(rows.reduce((sum, row) => sum + (row.total || 0), 0) * 100) / 100;
};

const sumShippingLines = (lines) => {
  if (!Array.isArray(lines) || !lines.length) return null;
  const amounts = lines.map((line) => toMoney(line.price ?? line.discounted_price ?? line.cost ?? line.amount));
  if (amounts.every((n) => n == null)) return null;
  return Math.round(amounts.reduce((sum, n) => sum + (n || 0), 0) * 100) / 100;
};

/**
 * Pull goods / shipping / grand totals from a shop payload regardless of platform.
 */
const extractShopTotals = (raw, lineItems) => {
  const nested = raw && (raw.order || raw.data);
  const p =
    raw && (raw.total != null || raw.total_price != null || raw.orderTotal != null || raw.priceSummary)
      ? raw
      : nested && typeof nested === 'object'
        ? nested
        : raw || {};
  const summary = p.priceSummary || {};
  const items = Array.isArray(lineItems)
    ? lineItems
    : p.line_items || p.lineItems || p.items || [];
  const itemsTotal =
    toMoney(
      p.subtotal ??
        p.subtotal_price ??
        p.itemsTotal ??
        p.goodsTotal ??
        summary.subtotal
    ) ?? sumLineTotals(items);
  const shippingTotal =
    toMoney(
      p.shipping_total ??
        p.total_shipping ??
        p.shippingTotal ??
        p.shipping_price ??
        (p.total_shipping_price_set && p.total_shipping_price_set.shop_money) ??
        summary.shipping
    ) ??
    sumShippingLines(
      p.shipping_lines || p.shippingLines || (p.shippingInfo && p.shippingInfo.shippingLine)
    );
  const orderTotal =
    toMoney(
      p.total ??
        p.total_price ??
        p.current_total_price ??
        p.orderTotal ??
        p.grandTotal ??
        summary.total
    ) ??
    (itemsTotal != null || shippingTotal != null
      ? Math.round(((itemsTotal || 0) + (shippingTotal || 0)) * 100) / 100
      : null);

  return {
    orderTotal,
    itemsTotal,
    shippingTotal,
    lineItems: compactLineItems(items),
  };
};

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
  const money = extractShopTotals(raw, lineItems);
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
    orderTotal: money.orderTotal,
    itemsTotal: money.itemsTotal,
    shippingTotal: money.shippingTotal,
    shopLineItems: money.lineItems,
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
  extractShopTotals,
  formatAddress,
  sumWeightKg,
};
