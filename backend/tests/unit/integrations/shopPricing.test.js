const { applyShopMarkup, matchingTableRates } = require('../../../src/integrations/bridge/shopPricing.service');

describe('shopPricing', () => {
  test('adds the shop extra percent on top of the CloudShip price', () => {
    expect(applyShopMarkup(110, 20)).toEqual({
      shopMarginPercent: 20,
      shopMarginAmount: 22,
      quotedPrice: 132,
    });
  });

  test('matches table rates by weight and country', () => {
    const settings = {
      tableRates: [
        { label: 'Local small', minWeightKg: 0, maxWeightKg: 5, country: 'ZA', price: 80 },
        { label: 'Heavy', minWeightKg: 20, maxWeightKg: 40, country: '', price: 400 },
      ],
    };
    const local = matchingTableRates(settings, {
      weightKg: 2,
      dropoff: '1 Long Street, Cape Town, 8001, South Africa',
    });
    expect(local.map((r) => r.label)).toEqual(['Local small']);
    const heavy = matchingTableRates(settings, { weightKg: 25, dropoff: 'London, United Kingdom' });
    expect(heavy.map((r) => r.label)).toEqual(['Heavy']);
  });
});
