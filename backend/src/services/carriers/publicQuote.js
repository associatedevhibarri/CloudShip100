const toPublicPartner = (row) => ({
  partnerId: row.partnerId,
  partnerName: row.partnerName,
  available: true,
  quoteId: row.quoteId,
  expiresAt: row.expiresAt,
  sellPrice: row.sellPrice,
  currency: row.currency,
  serviceName: row.serviceName,
  serviceCode: row.serviceCode || null,
  speed: row.speed || null,
  speedLabel: row.speedLabel || null,
  durationMinutes: row.durationMinutes || null,
  pickupMinutes: row.pickupMinutes || null,
  transitDays: Number.isFinite(row.transitDays) && row.transitDays > 0 ? row.transitDays : null,
  deliveryDate: row.deliveryDate || null,
});

const publicQuotes = (quoted) => {
  const partners = (quoted.partners || []).filter((row) => row.available).map(toPublicPartner);
  const cheapest =
    (quoted.cheapest && partners.find((row) => row.quoteId === quoted.cheapest.quoteId)) || partners[0] || null;
  const fastest =
    (quoted.fastest && partners.find((row) => row.quoteId === quoted.fastest.quoteId)) ||
    [...partners]
      .filter((row) => Number.isFinite(row.durationMinutes))
      .sort((a, b) => a.durationMinutes - b.durationMinutes)[0] ||
    null;
  return { partners, cheapest, fastest };
};

const friendlyBookMessage = (message) => {
  const text = String(message || '');
  if (/insufficient funds/i.test(text)) {
    return 'This courier cannot accept the booking right now. Please choose another option or try again later.';
  }
  if (/expired or not found/i.test(text)) {
    return 'That price expired. Request a new quote, then confirm again.';
  }
  if (/maps service not configured/i.test(text)) {
    return 'Please select a live courier price before confirming.';
  }
  if (/not configured/i.test(text)) {
    return 'This courier is not available yet.';
  }
  if (/authenticate|unauthorized|credentials/i.test(text)) {
    return 'This courier is temporarily unavailable. Request a new quote and try again.';
  }
  if (/deliverable area/i.test(text)) {
    return 'This courier does not deliver between those addresses.';
  }
  if (/invalid service and packaging|validation failed/i.test(text)) {
    return 'This courier cannot book that route. Please choose another option.';
  }
  if (/phone/i.test(text) && /invalid|required/i.test(text)) {
    return 'This courier needs a valid pickup and dropoff phone number.';
  }
  if (/parameters of your request were invalid/i.test(text)) {
    return 'This courier could not accept the booking. Request a new quote and try again.';
  }
  if (/expressed in inches|dimensions of package/i.test(text)) {
    return 'This courier cannot book that package size on this route. Please choose another option.';
  }
  return text || 'Could not book the selected courier';
};

module.exports = {
  publicQuotes,
  friendlyBookMessage,
};
