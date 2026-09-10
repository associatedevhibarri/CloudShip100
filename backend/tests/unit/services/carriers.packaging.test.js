const {
  getMaterialMultiplier,
  getClassificationMultiplier,
  calculatePackagingMultiplier,
} = require('../../../src/services/carriers/packaging');

describe('Carriers Packaging Material & Classification Service (Step 5)', () => {
  describe('Packaging Material Surcharges', () => {
    it('returns 1.0x for standard Carton or Box', () => {
      expect(getMaterialMultiplier('CARTON_OR_BOX')).toBe(1.0);
      expect(getMaterialMultiplier('PAPER')).toBe(1.0);
      expect(getMaterialMultiplier('HARD_PLASTIC')).toBe(1.0);
    });

    it('applies Unpackaged Bulk material surcharge (1.20x)', () => {
      expect(getMaterialMultiplier('UNPACKAGED_BULK')).toBe(1.20);
    });

    it('applies Metal or Steel material surcharge (1.08x)', () => {
      expect(getMaterialMultiplier('METAL_OR_STEEL')).toBe(1.08);
      expect(getMaterialMultiplier('STEEL')).toBe(1.08);
    });

    it('applies Organic Soft/Hard Material surcharge (1.05x)', () => {
      expect(getMaterialMultiplier('ORGANIC_SOFT_MATERIAL')).toBe(1.05);
      expect(getMaterialMultiplier('ORGANIC_HARD_MATERIAL')).toBe(1.05);
    });
  });

  describe('Packaging Classification Surcharges', () => {
    it('returns 1.0x for Bagged, Pelletized, Wrapped', () => {
      expect(getClassificationMultiplier('BAGGED')).toBe(1.0);
      expect(getClassificationMultiplier('PELLETIZED')).toBe(1.0);
      expect(getClassificationMultiplier('WRAPPED')).toBe(1.0);
    });

    it('applies Unwrapped classification surcharge (1.10x)', () => {
      expect(getClassificationMultiplier('UNWRAPPED')).toBe(1.10);
    });

    it('applies Strapped classification surcharge (1.02x)', () => {
      expect(getClassificationMultiplier('STRAPPED')).toBe(1.02);
    });
  });

  describe('Combined Packaging Multiplier', () => {
    it('calculates combined multiplier for Unpackaged Bulk + Unwrapped (worst case)', () => {
      // 1.20 * 1.10 = 1.32
      const result = calculatePackagingMultiplier({
        packagingMaterial: 'UNPACKAGED_BULK',
        packagingClassification: 'UNWRAPPED',
      });
      expect(result.combinedPackagingMultiplier).toBe(1.32);
    });

    it('calculates combined multiplier for Metal + Strapped', () => {
      // 1.08 * 1.02 = 1.1016 -> 1.10
      const result = calculatePackagingMultiplier({
        packagingMaterial: 'METAL_OR_STEEL',
        packagingClassification: 'STRAPPED',
      });
      expect(result.combinedPackagingMultiplier).toBe(1.10);
    });

    it('stores bag weight when Bagged classification used', () => {
      const result = calculatePackagingMultiplier({
        packagingMaterial: 'CARTON_OR_BOX',
        packagingClassification: 'BAGGED',
        bagWeightKg: 50,
      });
      expect(result.bagWeightKg).toBe(50);
      expect(result.combinedPackagingMultiplier).toBe(1.0);
    });
  });
});
