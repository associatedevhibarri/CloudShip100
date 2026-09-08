const { classifySpeed, minutesFromMeta, transitDaysFromMeta, normalizeOptions } = require('../../../src/services/carriers/speed');

describe('classifySpeed', () => {
  test('maps partner services onto economy, standard, premium, and on-demand', () => {
    expect(classifySpeed({ partnerId: 'uber_direct' })).toBe('on_demand');
    expect(classifySpeed({ serviceName: 'Economy', serviceCode: 'ECO' })).toBe('economy');
    expect(classifySpeed({ serviceName: 'FedEx Express Saver', serviceCode: 'FEDEX_EXPRESS_SAVER' })).toBe('economy');
    expect(classifySpeed({ serviceName: 'FedEx 2Day', serviceCode: 'FEDEX_2_DAY' })).toBe('standard');
    expect(classifySpeed({ serviceName: 'Priority Overnight', serviceCode: 'PRIORITY_OVERNIGHT' })).toBe('premium');
    expect(classifySpeed({ serviceName: 'Same Day', serviceCode: 'SMD' })).toBe('on_demand');
  });
});

describe('transit helpers', () => {
  test('converts FedEx transit labels and DHL days into minutes', () => {
    expect(minutesFromMeta({ transitTime: 'TWO_DAYS' })).toBe(2 * 24 * 60);
    expect(minutesFromMeta({ transitDays: 3 })).toBe(3 * 24 * 60);
    expect(minutesFromMeta({ duration: 45 })).toBe(45);
    expect(transitDaysFromMeta({ transitTime: 'ONE_DAY' })).toBe(1);
  });

  test('flattens adapter option payloads', () => {
    expect(normalizeOptions({ options: [{ partnerPrice: 1 }, { partnerPrice: 2 }] })).toHaveLength(2);
    expect(normalizeOptions({ partnerPrice: 9 })).toHaveLength(1);
  });
});
