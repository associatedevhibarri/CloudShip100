const { applyMargin } = require('../../../src/services/carriers/margin');

describe('applyMargin', () => {
  test('adds percent and flat cut on top of the courier quote', () => {
    expect(applyMargin(100, { percent: 10, flat: 5 })).toEqual({
      partnerPrice: 100,
      marginAmount: 15,
      sellPrice: 115,
    });
  });

  test('zero margin returns the partner price', () => {
    expect(applyMargin(80, { percent: 0, flat: 0 })).toEqual({
      partnerPrice: 80,
      marginAmount: 0,
      sellPrice: 80,
    });
  });
});
