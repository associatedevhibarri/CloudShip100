const {
  BUILDING_ACCESS_MULTIPLIERS,
  getBuildingAccessMultiplier,
  milesToKm,
  metersToKm,
  haversineDistanceKm,
  calculateFallbackDistanceKm,
  calculateDistanceKm,
} = require('../../../src/services/carriers/distance');

describe('Carriers Distance Service (Step 1)', () => {
  describe('Unit conversions', () => {
    it('converts miles to km accurately', () => {
      expect(milesToKm(10)).toBeCloseTo(16.0934, 3);
      expect(milesToKm(50)).toBeCloseTo(80.4672, 3);
    });

    it('converts meters to km', () => {
      expect(metersToKm(1500)).toBe(1.5);
      expect(metersToKm(10000)).toBe(10);
    });
  });

  describe('Building Access Surcharges', () => {
    it('returns 1.0 for standard commercial or residential locations', () => {
      expect(getBuildingAccessMultiplier('COMMERCIAL')).toBe(1.0);
      expect(getBuildingAccessMultiplier('RESIDENTIAL')).toBe(1.0);
      expect(getBuildingAccessMultiplier('HOUSE')).toBe(1.0);
      expect(getBuildingAccessMultiplier('OFFICE')).toBe(1.0);
    });

    it('applies agricultural/farm location surcharges (1.15x)', () => {
      expect(getBuildingAccessMultiplier('FARM')).toBe(1.15);
      expect(getBuildingAccessMultiplier('RANCH')).toBe(1.15);
      expect(getBuildingAccessMultiplier('SILO')).toBe(1.15);
      expect(getBuildingAccessMultiplier('RURAL_COLLECTION_POINT')).toBe(1.15);
    });

    it('applies mining/refinery facility surcharges', () => {
      expect(getBuildingAccessMultiplier('MINING_FACILITY')).toBe(1.20);
      expect(getBuildingAccessMultiplier('REFINERY')).toBe(1.15);
    });

    it('applies construction site surcharges (1.25x)', () => {
      expect(getBuildingAccessMultiplier('CONSTRUCTION_SITE_OFFICE')).toBe(1.25);
    });

    it('handles fuzzy/case-insensitive matching', () => {
      expect(getBuildingAccessMultiplier('farm depot')).toBe(1.12);
      expect(getBuildingAccessMultiplier('bonded warehouse site')).toBe(1.10);
    });
  });

  describe('Distance Calculation Logic', () => {
    it('calculates geodesic haversine distance with curvature fallback factor', () => {
      // Sandton (lat: -26.1076, lng: 28.0567) to Rosebank (lat: -26.1465, lng: 28.0435)
      const origin = { lat: -26.1076, lng: 28.0567 };
      const dest = { lat: -26.1465, lng: 28.0435 };
      const distance = calculateFallbackDistanceKm(origin, dest);

      expect(distance).toBeGreaterThan(4);
      expect(distance).toBeLessThan(10);
    });

    it('computes effective billable km including collection & delivery building multipliers', async () => {
      const origin = { street: 'Main Rd Farm', buildingType: 'FARM', lat: -26.1076, lng: 28.0567 };
      const dest = { street: 'Mine Site 4', buildingType: 'MINING_FACILITY', lat: -26.1465, lng: 28.0435 };

      const result = await calculateDistanceKm(origin, dest);

      expect(result.unit).toBe('km');
      expect(result.originAccessMultiplier).toBe(1.15);
      expect(result.destinationAccessMultiplier).toBe(1.20);
      expect(result.combinedAccessMultiplier).toBe(1.38); // 1.15 * 1.20
      expect(result.effectiveBillableKm).toBe(Math.round(result.baseDistanceKm * 1.38 * 100) / 100);
    });
  });
});
