const {
  normalizeDimensionToCm,
  calculateDimensions,
  calculateSpecialHandlingMultiplier,
} = require('../../../src/services/carriers/formSpecial');

describe('Carriers Dimensions & Special Classifications Service (Steps 3 & 4)', () => {
  describe('Dimension Unit Conversions', () => {
    it('converts meters to cm', () => {
      expect(normalizeDimensionToCm(1.5, 'M')).toBe(150);
    });

    it('converts inches to cm', () => {
      expect(normalizeDimensionToCm(10, 'IN')).toBeCloseTo(25.4, 1);
    });

    it('converts feet to cm', () => {
      expect(normalizeDimensionToCm(2, 'FT')).toBeCloseTo(60.96, 1);
    });

    it('calculates total volume in m3 from dimensions', () => {
      // 100cm x 100cm x 100cm = 1.0 m3
      const result = calculateDimensions({ length: 100, width: 100, height: 100, unit: 'CM' });
      expect(result.lengthCm).toBe(100);
      expect(result.volumeM3).toBe(1.0);
    });
  });

  describe('Special Handling & Hazmat Classifications', () => {
    it('applies flammable hazmat surcharge (1.25x)', () => {
      const multiplier = calculateSpecialHandlingMultiplier({ cargoForm: 'SOLID', flammable: true });
      expect(multiplier).toBe(1.25);
    });

    it('applies perishable temperature control surcharge (1.20x)', () => {
      const multiplier = calculateSpecialHandlingMultiplier({ cargoForm: 'SOLID', perishable: true });
      expect(multiplier).toBe(1.20);
    });

    it('applies fragile handling surcharge (1.10x)', () => {
      const multiplier = calculateSpecialHandlingMultiplier({ cargoForm: 'SOLID', fragile: true });
      expect(multiplier).toBe(1.10);
    });

    it('applies extra labour loading surcharge (1.15x)', () => {
      const multiplier = calculateSpecialHandlingMultiplier({ cargoForm: 'SOLID', extraLabour: true });
      expect(multiplier).toBe(1.15);
    });

    it('combines liquid form (1.10x) with flammable hazmat (1.25x)', () => {
      // 1.10 * 1.25 = 1.375 -> 1.38
      const multiplier = calculateSpecialHandlingMultiplier({ cargoForm: 'LIQUID', flammable: true });
      expect(multiplier).toBe(1.38);
    });
  });
});
