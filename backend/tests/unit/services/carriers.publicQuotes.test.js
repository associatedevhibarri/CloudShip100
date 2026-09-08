const { publicQuotes, friendlyBookMessage } = require('../../../src/services/carriers/publicQuote');

describe('publicQuotes', () => {
  test('returns only bookable couriers and strips internal errors', () => {
    const quoted = {
      partners: [
        { partnerId: 'courier_guy', partnerName: 'Courier Guy', available: true, quoteId: 'csq_1', sellPrice: 132, currency: 'ZAR', serviceName: 'Economy', partnerPrice: 120, marginAmount: 12, speed: 'economy', speedLabel: 'Economy', durationMinutes: 2880, transitDays: 2 },
        { partnerId: 'fedex', partnerName: 'FedEx', available: false, error: 'Invalid service and packaging combination' },
        { partnerId: 'dhl_express', partnerName: 'DHL Express', available: false, error: 'Not configured. Add API credentials to the backend .env' },
      ],
      cheapest: { partnerId: 'courier_guy', quoteId: 'csq_1', sellPrice: 132, available: true },
    };
    const result = publicQuotes(quoted);
    expect(result.partners).toHaveLength(1);
    expect(result.partners[0]).toMatchObject({ partnerId: 'courier_guy', sellPrice: 132, speed: 'economy' });
    expect(result.partners[0].error).toBeUndefined();
    expect(result.partners[0].partnerPrice).toBeUndefined();
    expect(result.cheapest.quoteId).toBe('csq_1');
  });
});

describe('friendlyBookMessage', () => {
  test('hides wallet and auth failures from customers', () => {
    expect(friendlyBookMessage('insufficient funds for the account')).toMatch(/cannot accept the booking/i);
    expect(friendlyBookMessage('We could not authenticate your credentials')).toMatch(/temporarily unavailable/i);
    expect(friendlyBookMessage('Not configured. Add API credentials to the backend .env')).toMatch(/not available/i);
    expect(
      friendlyBookMessage(
        'Dimensions of package 1 must be expressed in inches (IN) for domestic express shipments. Please update and try again.',
      ),
    ).toMatch(/cannot book that package size/i);
    expect(friendlyBookMessage('The parameters of your request were invalid. (pickup_phone_number: invalid)')).toMatch(
      /valid pickup and dropoff phone/i,
    );
  });
});
