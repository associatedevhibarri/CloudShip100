const { packageLineItem } = require('../../../src/services/carriers/fedexPackage');

describe('FedEx package units', () => {
  test('uses inches and pounds for US domestic express', () => {
    expect(
      packageLineItem({
        pickup: '7372 Parkridge Blvd, Irving, TX 75063, United States',
        dropoff: '1550 Union Ave, Memphis, TN 38104, United States',
        weightKg: 2,
        lengthCm: 20,
        widthCm: 30,
        heightCm: 20,
      }),
    ).toEqual({
      weight: { units: 'LB', value: 4.4 },
      dimensions: { length: 8, width: 12, height: 8, units: 'IN' },
    });
  });

  test('keeps centimetres and kilograms for international', () => {
    expect(
      packageLineItem({
        pickup: '12 Rivonia Road, Sandton, 2196, South Africa',
        dropoff: '10 Downing Street, London, SW1A 2AA, United Kingdom',
        weightKg: 3,
        lengthCm: 30,
        widthCm: 25,
        heightCm: 20,
      }),
    ).toEqual({
      weight: { units: 'KG', value: 3 },
      dimensions: { length: 30, width: 25, height: 20, units: 'CM' },
    });
  });
});
