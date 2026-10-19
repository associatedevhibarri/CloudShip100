const WARNING = 'You’ll have to include delivery with this one, or make it Pickup Only - our delivery partners are not yet compatible with these types of commodities.';
const key = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
// These require specialist carrier services that this integration does not yet book.
function eligibility(commodities) {
  if (!Array.isArray(commodities) || !commodities.length || commodities.length > 100) return { status: 'incomplete', reason: 'Provide commodity details.' };
  if (commodities.some(item => !item || !key(item.cargoForm) || !key(item.packagingType || item.packagingClassification?.mainOption))) return { status: 'incomplete', reason: 'Complete the commodity form and packaging type before choosing CloudShip delivery.' };
  const blocked = commodities.some(item => {
    const form = key(item.cargoForm);
    const packaging = key(item.packagingType || item.packagingClassification?.mainOption);
    const classes = (item.specialClassifications || []).map(key);
    return ['liquid', 'liquids', 'gas', 'gases'].includes(form) || ['bulk', 'unpackagedbulk', 'liquidtanker', 'containerized'].includes(packaging)
      || item.flammable || item.perishable || classes.some(value => /flammable|hazard|dangerous|perishable|refrigerat|additionallabour/.test(value));
  });
  return blocked ? { status: 'unsupported', reason: WARNING } : { status: 'eligible', reason: 'Subject to carrier service and route availability.' };
}
function expandShipment(input) {
  if (!input || typeof input.pickup !== 'string' || typeof input.dropoff !== 'string' || !input.pickup.trim() || !input.dropoff.trim()) throw new Error('Collection and delivery addresses are required.');
  if (!Array.isArray(input.parcels) || !input.parcels.length || input.parcels.length > 100) throw new Error('Provide packaged parcels.');
  const result = [];
  input.parcels.forEach(parcel => {
    if (!Number.isSafeInteger(parcel.quantity) || parcel.quantity < 1 || !['weightKg', 'lengthCm', 'widthCm', 'heightCm'].every(field => Number.isFinite(parcel[field]) && parcel[field] > 0)) throw new Error('Provide valid packaged weights, dimensions and quantities.');
    if (result.length + parcel.quantity > 20) throw new Error('CloudShip checkout supports up to 20 parcels per shipment. Use seller delivery for larger shipments.');
    for (let i = 0; i < parcel.quantity; i += 1) result.push({ pickup: input.pickup, pickupPhone: input.pickupPhone, dropoff: input.dropoff, cargo: input.cargo || 'Commodity parcel', mode: 'Road', weightKg: parcel.weightKg, lengthCm: parcel.lengthCm, widthCm: parcel.widthCm, heightCm: parcel.heightCm });
  });
  return result;
}
const choose = (quotes, partner, service, currency) => quotes.find(row => row.available && row.partnerId === partner && row.serviceName === service && row.currency === currency);
function commonOptions(rows) {
  return rows[0].filter(option => option.available && Number(option.sellPrice) > 0).flatMap(first => {
    const matches = rows.map(row => choose(row, first.partnerId, first.serviceName, first.currency));
    if (matches.some(item => !item)) return [];
    return [{ partner: first.partnerId, service: first.serviceName, currency: first.currency,
      quotedPrice: Math.round(matches.reduce((sum, item) => sum + Number(item.sellPrice), 0) * 100) / 100,
      etaHours: Math.max(...matches.map(item => item.transitDays ? item.transitDays * 24 : item.durationMinutes ? item.durationMinutes / 60 : 0)) || null }];
  });
}
module.exports = { eligibility, expandShipment, commonOptions, choose };
