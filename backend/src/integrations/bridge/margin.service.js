const config = require('../../config/config');

/**
 * Apply CloudShip margin on top of live carrier cost.
 * We never invent carrier prices — only add our cut (Anje / Vasanth agreement).
 *
 * @param {number} carrierCost
 * @param {{ percent?: number, fixed?: number }} [overrides]
 * @returns {{ carrierCost: number, marginAmount: number, marginPercent: number, quotedPrice: number }}
 */
const applyMargin = (carrierCost, overrides = {}) => {
  const cost = Number(carrierCost);
  if (!Number.isFinite(cost) || cost < 0) {
    throw new Error('carrierCost must be a non-negative number');
  }

  const percent =
    overrides.percent != null ? Number(overrides.percent) : Number(config.ecommerce.marginPercent);
  const fixed = overrides.fixed != null ? Number(overrides.fixed) : Number(config.ecommerce.marginFixed);

  if (!Number.isFinite(percent) || percent < 0) {
    throw new Error('margin percent invalid');
  }
  if (!Number.isFinite(fixed) || fixed < 0) {
    throw new Error('margin fixed invalid');
  }

  const marginAmount = Math.round((cost * (percent / 100) + fixed) * 100) / 100;
  const quotedPrice = Math.round((cost + marginAmount) * 100) / 100;

  return {
    carrierCost: Math.round(cost * 100) / 100,
    marginAmount,
    marginPercent: percent,
    quotedPrice,
  };
};

module.exports = {
  applyMargin,
};
