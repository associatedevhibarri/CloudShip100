const { structuredAddress, toE164, scheduleWindow } = require('../../../src/services/carriers/uberDirect.helpers');

describe('Uber Direct helpers', () => {
  test('uses E.164 South Africa defaults instead of zeros', () => {
    expect(toE164('0000000000', 'ZA')).toBe('+27821234567');
    expect(toE164('0821234567', 'ZA')).toBe('+27821234567');
    expect(toE164('+1 206 555 1212', 'US')).toBe('+12065551212');
  });

  test('keeps US state and ZA province in the address payload', () => {
    expect(JSON.parse(structuredAddress('7372 Parkridge Blvd, Irving, TX 75063, United States'))).toMatchObject({
      city: 'Irving',
      state: 'TX',
      zip_code: '75063',
      country: 'US',
    });
    expect(JSON.parse(structuredAddress('23 Juta Street, Braamfontein, Johannesburg, 2001, South Africa'))).toMatchObject({
      city: 'Johannesburg',
      state: 'GP',
      zip_code: '2001',
      country: 'ZA',
    });
  });

  test('sends a full pickup window only for future dates', () => {
    expect(scheduleWindow({ pickupDate: '2020-01-01' })).toEqual({});
    expect(scheduleWindow({ pickupDate: '2099-01-01' })).toEqual({
      pickup_ready_dt: '2099-01-01T08:00:00.000Z',
      pickup_deadline_dt: '2099-01-01T09:00:00.000Z',
      dropoff_ready_dt: '2099-01-01T08:30:00.000Z',
      dropoff_deadline_dt: '2099-01-01T12:30:00.000Z',
    });
  });
});
