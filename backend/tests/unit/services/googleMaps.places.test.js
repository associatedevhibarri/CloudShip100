const { mapPlaceToAddress } = require('../../../src/services/googleMaps.service');

describe('Google Places address mapping', () => {
  test('maps a South Africa street into courier fields', () => {
    expect(
      mapPlaceToAddress({
        formatted_address: '12 Rivonia Rd, Sandhurst, Sandton, 2196, South Africa',
        address_components: [
          { long_name: '12', short_name: '12', types: ['street_number'] },
          { long_name: 'Rivonia Road', short_name: 'Rivonia Rd', types: ['route'] },
          { long_name: 'Sandton', short_name: 'Sandton', types: ['locality', 'political'] },
          { long_name: 'Gauteng', short_name: 'GP', types: ['administrative_area_level_1', 'political'] },
          { long_name: '2196', short_name: '2196', types: ['postal_code'] },
          { long_name: 'South Africa', short_name: 'ZA', types: ['country', 'political'] },
        ],
      })
    ).toEqual({
      formatted: '12 Rivonia Rd, Sandhurst, Sandton, 2196, South Africa',
      street: '12 Rivonia Road',
      city: 'Sandton',
      state: 'GP',
      postalCode: '2196',
      country: 'ZA',
    });
  });

  test('maps a US FedEx test origin', () => {
    expect(
      mapPlaceToAddress({
        formatted_address: '7372 Parkridge Blvd, Irving, TX 75063, USA',
        address_components: [
          { long_name: '7372', short_name: '7372', types: ['street_number'] },
          { long_name: 'Parkridge Boulevard', short_name: 'Parkridge Blvd', types: ['route'] },
          { long_name: 'Irving', short_name: 'Irving', types: ['locality', 'political'] },
          { long_name: 'Texas', short_name: 'TX', types: ['administrative_area_level_1', 'political'] },
          { long_name: '75063', short_name: '75063', types: ['postal_code'] },
          { long_name: 'United States', short_name: 'US', types: ['country', 'political'] },
        ],
      })
    ).toMatchObject({
      street: '7372 Parkridge Boulevard',
      city: 'Irving',
      state: 'TX',
      postalCode: '75063',
      country: 'US',
    });
  });
});
