/**
 * Sell price the shop sees: partner quote + CloudShip cut.
 * @param {number} partnerPrice
 * @param {{ percent?: number, flat?: number }} margin
 * @returns {{ partnerPrice: number, marginAmount: number, sellPrice: number }}
 */
const applyMargin = (partnerPrice, margin = {}) => {
  const price = Number(partnerPrice);
  if (!Number.isFinite(price) || price < 0) {
    throw new Error('Invalid partner price');
  }
  const percent = Number(margin.percent) || 0;
  const flat = Number(margin.flat) || 0;
  const marginAmount = Math.round((price * (percent / 100) + flat) * 100) / 100;
  const sellPrice = Math.round((price + marginAmount) * 100) / 100;
  return { partnerPrice: Math.round(price * 100) / 100, marginAmount, sellPrice };
};

module.exports = {
  applyMargin,
};
