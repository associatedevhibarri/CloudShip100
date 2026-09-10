const {
  convertToKg,
  convertToM3,
  normalizeCargoUnits,
} = require('../../../src/services/carriers/units');

describe('Carriers Mass & Volume Units Service (Step 2)', () => {
  describe('Mass Unit Conversions to KG', () => {
    it('converts metric tons to kg', () => {
      expect(convertToKg(5, 'TONNE')).toBe(5000);
      expect(convertToKg(2, 'T')).toBe(2000);
    });

    it('converts US pounds (lbs) to kg', () => {
      expect(convertToKg(100, 'LB')).toBeCloseTo(45.3592, 3);
    });

    it('converts agricultural bushels to kg', () => {
      expect(convertToKg(100, 'BUSHEL')).toBeCloseTo(2721.55, 2);
    });

    it('converts TEU/FEU container units', () => {
      const teuResult = normalizeCargoUnits({ quantity: 1, unit: 'TEU' });
      expect(teuResult.actualWeightKg).toBe(14000);
      expect(teuResult.volumeM3).toBe(33.2);
    });
  });

  describe('Liquid & Volume Unit Conversions to M3', () => {
    it('converts IBC tanks to volume m3 and liters', () => {
      expect(convertToM3(5, 'IBC')).toBe(5.0);
    });

    it('converts 200L drums to m3', () => {
      expect(convertToM3(10, 'DRUM')).toBe(2.0);
    });

    it('converts US gallons to m3', () => {
      expect(convertToM3(1000, 'US_GAL')).toBeCloseTo(3.78541, 3);
    });
  });

  describe('Volumetric Chargeable Weight Logic', () => {
    it('calculates chargeable weight as max of actual mass vs volumetric weight', () => {
      // 10 m3 volume results in 10 * 200 = 2000 kg volumetric weight
      const result = normalizeCargoUnits({
        quantity: 10,
        unit: 'M3',
        weightKg: 500, // Actual weight is lower
      });

      expect(result.volumeM3).toBe(10);
      expect(result.volumetricWeightKg).toBe(2000);
      expect(result.chargeableWeightKg).toBe(2000);
    });
  });
});
