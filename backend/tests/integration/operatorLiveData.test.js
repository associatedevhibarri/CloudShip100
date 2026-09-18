const mongoose = require('mongoose');
const request = require('supertest');
const httpStatus = require('http-status');
const moment = require('moment');
const app = require('../../src/app');
const config = require('../../src/config/config');
const setupTestDB = require('../utils/setupTestDB');
const { tokenTypes } = require('../../src/config/tokens');
const tokenService = require('../../src/services/token.service');
const { Booking, Company, Invoice, Notification, DriverProfile, Trip } = require('../../src/models');
const { admin, userOne, insertUsers } = require('../fixtures/user.fixture');
const { adminAccessToken, userOneAccessToken } = require('../fixtures/token.fixture');

setupTestDB();

const auth = (token) => ['Authorization', `Bearer ${token}`];

const makeCustomer = () => {
  const customer = {
    _id: mongoose.Types.ObjectId(),
    name: 'Portal Customer',
    email: 'portal.customer@example.com',
    password: 'password1',
    role: 'customer',
    isEmailVerified: true,
  };
  const accessTokenExpires = moment().add(config.jwt.accessExpirationMinutes, 'minutes');
  const accessToken = tokenService.generateToken(customer._id, accessTokenExpires, tokenTypes.ACCESS);
  return { customer, accessToken };
};

describe('Operator live data routes', () => {
  test('should return empty live dashboard for admin and reject anonymous access', async () => {
    await insertUsers([admin]);

    await request(app).get('/v1/dashboard').expect(httpStatus.UNAUTHORIZED);

    const res = await request(app).get('/v1/dashboard').set(...auth(adminAccessToken)).expect(httpStatus.OK);

    expect(res.body.kpis).toEqual({
      totalRevenue: 0,
      deliveries: 0,
      newCustomers: 0,
      inTransit: 0,
      drivers: 0,
      driversOnTrip: 0,
      pendingBookings: 0,
      openInvoices: 0,
    });
    expect(res.body.totalBookings).toBe(0);
    expect(res.body.statusMix).toHaveLength(3);
    expect(res.body.activity).toHaveLength(7);
  });

  test('should forbid operator list endpoints for users without operator rights', async () => {
    await insertUsers([userOne]);

    await request(app).get('/v1/bookings').set(...auth(userOneAccessToken)).expect(httpStatus.FORBIDDEN);
    await request(app).get('/v1/companies').set(...auth(userOneAccessToken)).expect(httpStatus.FORBIDDEN);
    await request(app).get('/v1/invoices').set(...auth(userOneAccessToken)).expect(httpStatus.FORBIDDEN);
    await request(app).get('/v1/notifications').set(...auth(userOneAccessToken)).expect(httpStatus.FORBIDDEN);
    await request(app).get('/v1/dashboard').set(...auth(userOneAccessToken)).expect(httpStatus.FORBIDDEN);
    await request(app).get('/v1/drivers').set(...auth(userOneAccessToken)).expect(httpStatus.FORBIDDEN);
    await request(app).get('/v1/trips').set(...auth(userOneAccessToken)).expect(httpStatus.FORBIDDEN);
    await request(app).get('/v1/finance').set(...auth(userOneAccessToken)).expect(httpStatus.FORBIDDEN);
    await request(app).get('/v1/expenses').set(...auth(userOneAccessToken)).expect(httpStatus.FORBIDDEN);
    await request(app).get('/v1/fleet').set(...auth(userOneAccessToken)).expect(httpStatus.FORBIDDEN);
  });

  test('should list live bookings, companies, invoices, and notifications for admin', async () => {
    await insertUsers([admin]);

    const company = await Company.create({
      name: 'Live Metals',
      contact: 'Lebo',
      email: 'ops@livemetals.test',
      phone: '+27 11 000 0000',
      tier: 'Enterprise',
      owner: admin._id,
    });
    const booking = await Booking.create({
      company: company._id,
      code: 'BKG-9001',
      status: 'pending',
      mode: 'Road',
      cargo: 'Steel coils',
      value: 12500,
      pickup: 'Durban',
      dropoff: 'Lusaka',
    });
    await Invoice.create({
      company: company._id,
      booking: booking._id,
      amount: 12500,
      status: 'Open',
      due: new Date('2026-09-20'),
    });
    await Invoice.create({
      company: company._id,
      amount: 4000,
      status: 'Paid',
      due: new Date('2026-08-01'),
    });
    await Notification.create({
      company: company._id,
      title: 'Booking confirmed',
      body: 'BKG-9001 is booked',
      type: 'booking',
    });

    const bookings = await request(app).get('/v1/bookings').set(...auth(adminAccessToken)).expect(httpStatus.OK);
    expect(bookings.body).toHaveLength(1);
    expect(bookings.body[0].code).toBe('BKG-9001');
    expect(bookings.body[0].company.name).toBe('Live Metals');

    const pending = await request(app)
      .get('/v1/bookings')
      .query({ status: 'pending' })
      .set(...auth(adminAccessToken))
      .expect(httpStatus.OK);
    expect(pending.body).toHaveLength(1);

    const history = await request(app)
      .get('/v1/bookings')
      .query({ status: 'history' })
      .set(...auth(adminAccessToken))
      .expect(httpStatus.OK);
    expect(history.body).toHaveLength(0);

    const companies = await request(app).get('/v1/companies').set(...auth(adminAccessToken)).expect(httpStatus.OK);
    expect(companies.body).toHaveLength(1);
    expect(companies.body[0].name).toBe('Live Metals');
    expect(companies.body[0].outstanding).toBe(12500);

    const invoices = await request(app).get('/v1/invoices').set(...auth(adminAccessToken)).expect(httpStatus.OK);
    expect(invoices.body).toHaveLength(2);
    expect(invoices.body[0].company.name).toBe('Live Metals');

    const notifications = await request(app)
      .get('/v1/notifications')
      .set(...auth(adminAccessToken))
      .expect(httpStatus.OK);
    expect(notifications.body).toHaveLength(1);
    expect(notifications.body[0].title).toBe('Booking confirmed');

    const dashboard = await request(app).get('/v1/dashboard').set(...auth(adminAccessToken)).expect(httpStatus.OK);
    expect(dashboard.body.kpis.totalRevenue).toBe(4000);
    expect(dashboard.body.kpis.inTransit).toBe(0);
    expect(dashboard.body.kpis.pendingBookings).toBe(1);
    expect(dashboard.body.kpis.openInvoices).toBe(1);
    expect(dashboard.body.totalBookings).toBe(1);
  });

  test('should list registered drivers for admin', async () => {
    const driver = {
      _id: mongoose.Types.ObjectId(),
      name: 'Thandi Nkosi',
      email: 'thandi.driver@example.com',
      password: 'password1',
      role: 'driver',
      isEmailVerified: true,
    };
    await insertUsers([admin, driver]);
    await DriverProfile.create({
      user: driver._id,
      employeeId: 'DRV-01',
      phone: '+27 71 000 0000',
      licenseClass: 'EC',
    });

    const res = await request(app).get('/v1/drivers').set(...auth(adminAccessToken)).expect(httpStatus.OK);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Thandi Nkosi');
    expect(res.body[0].employeeId).toBe('DRV-01');
    expect(res.body[0].status).toBe('Available');

    const dashboard = await request(app).get('/v1/dashboard').set(...auth(adminAccessToken)).expect(httpStatus.OK);
    expect(dashboard.body.kpis.drivers).toBe(1);
    expect(dashboard.body.kpis.driversOnTrip).toBe(0);
  });

  test('should keep customer mine-scoped booking routes working', async () => {
    const { customer, accessToken } = makeCustomer();
    const company = await Company.create({
      name: 'Buyer Co',
      contact: customer.name,
      email: customer.email,
      owner: customer._id,
    });
    customer.company = company._id;
    await insertUsers([customer]);
    await Booking.create({
      company: company._id,
      code: 'BKG-MINE',
      status: 'pending',
      mode: 'Air',
      cargo: 'Parts',
      value: 900,
      pickup: 'JNB',
      dropoff: 'CPT',
    });

    const mine = await request(app).get('/v1/bookings/mine').set(...auth(accessToken)).expect(httpStatus.OK);
    expect(mine.body).toHaveLength(1);
    expect(mine.body[0].code).toBe('BKG-MINE');

    await request(app).get('/v1/bookings').set(...auth(accessToken)).expect(httpStatus.FORBIDDEN);
  });

  test('should return empty trips and finance without demo rows for admin', async () => {
    await insertUsers([admin]);

    const trips = await request(app).get('/v1/trips').set(...auth(adminAccessToken)).expect(httpStatus.OK);
    expect(trips.body).toEqual([]);
    expect(trips.body.some((row) => row.id === 'TRP-1001')).toBe(false);

    const finance = await request(app).get('/v1/finance').set(...auth(adminAccessToken)).expect(httpStatus.OK);
    expect(finance.body.collected).toBe(0);
    expect(finance.body.outstanding).toBe(0);
    expect(finance.body.monthlyCollected).toBe(0);
    expect(finance.body.transactions).toEqual([]);
    expect(finance.body.byMode).toHaveLength(7);
    expect(JSON.stringify(finance.body)).not.toContain('AfriMetals');
  });

  test('should list live trips for admin', async () => {
    const driver = {
      _id: mongoose.Types.ObjectId(),
      name: 'Thandi Nkosi',
      email: 'thandi.trips@example.com',
      password: 'password1',
      role: 'driver',
      isEmailVerified: true,
    };
    await insertUsers([admin, driver]);
    const profile = await DriverProfile.create({
      user: driver._id,
      employeeId: 'DRV-01',
      phone: '+27 71 000 0000',
      licenseClass: 'EC',
      assignedVehicle: 'GP 111 GP',
    });
    await Trip.create({
      code: 'TRP-LIVE-1',
      driverProfile: profile._id,
      vehicle: 'GP 111 GP',
      cargo: 'Copper cathodes',
      pickup: 'Durban',
      dropoff: 'Lusaka',
      status: 'in_progress',
      mode: 'road',
      distanceKm: 2100,
      startAt: new Date(),
    });

    const res = await request(app).get('/v1/trips').set(...auth(adminAccessToken)).expect(httpStatus.OK);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe('TRP-LIVE-1');
    expect(res.body[0].driver).toBe('Thandi Nkosi');
    expect(res.body[0].status).toBe('in_progress');
    expect(res.body[0].vehicle).toBe('GP 111 GP');
    expect(res.body.some((row) => row.id === 'TRP-1001')).toBe(false);

    const filtered = await request(app)
      .get('/v1/trips')
      .query({ status: 'starting_soon' })
      .set(...auth(adminAccessToken))
      .expect(httpStatus.OK);
    expect(filtered.body).toHaveLength(0);
  });

  test('should summarize finance from invoices for admin', async () => {
    await insertUsers([admin]);
    const company = await Company.create({
      name: 'Live Metals',
      contact: 'Lebo',
      email: 'ops@livemetals.test',
      owner: admin._id,
    });
    const booking = await Booking.create({
      company: company._id,
      code: 'BKG-FIN-1',
      status: 'pending',
      mode: 'Road',
      cargo: 'Steel',
      value: 8000,
      pickup: 'Durban',
      dropoff: 'Lusaka',
    });
    await Invoice.create({
      company: company._id,
      booking: booking._id,
      amount: 8000,
      status: 'Paid',
      due: new Date('2026-08-01'),
    });
    await Invoice.create({
      company: company._id,
      amount: 2500,
      status: 'Open',
      due: new Date('2026-09-20'),
    });

    const res = await request(app).get('/v1/finance').set(...auth(adminAccessToken)).expect(httpStatus.OK);
    expect(res.body.collected).toBe(8000);
    expect(res.body.outstanding).toBe(2500);
    expect(res.body.monthlyCollected).toBe(8000);
    expect(res.body.transactions).toHaveLength(2);
    expect(JSON.stringify(res.body.transactions)).not.toContain('AfriMetals');
    const currentMonth = res.body.byMode[res.body.byMode.length - 1];
    expect(currentMonth.road).toBe(8000);
  });

  test('should expose warehouse map assets and routes without frontend dummy ids', async () => {
    await insertUsers([admin]);

    const res = await request(app).get('/v1/warehouse').set(...auth(adminAccessToken)).expect(httpStatus.OK);
    const mapIds = (res.body.mapAssets || []).map((asset) => asset.id);
    const labels = JSON.stringify(res.body.mapAssets || []);
    expect(mapIds).not.toContain('MAP-01');
    expect(labels).not.toContain('AfriMetals');
    expect(res.body.routes || []).toEqual([]);
  });

  test('should return empty expenses and fleet without dummy rows, then persist created records', async () => {
    await insertUsers([admin]);

    const emptyFuel = await request(app)
      .get('/v1/expenses')
      .query({ kind: 'fuel' })
      .set(...auth(adminAccessToken))
      .expect(httpStatus.OK);
    expect(emptyFuel.body).toEqual([]);
    expect(emptyFuel.body.some((row) => row.id === 'FL-01')).toBe(false);

    const createdFuel = await request(app)
      .post('/v1/expenses')
      .set(...auth(adminAccessToken))
      .send({ kind: 'fuel', asset: 'GP 111 GP', liters: 40, cost: 800, location: 'Durban', date: '2026-09-16' })
      .expect(httpStatus.CREATED);
    expect(createdFuel.body.asset).toBe('GP 111 GP');
    expect(createdFuel.body.cost).toBe(800);

    const fuel = await request(app)
      .get('/v1/expenses')
      .query({ kind: 'fuel' })
      .set(...auth(adminAccessToken))
      .expect(httpStatus.OK);
    expect(fuel.body).toHaveLength(1);

    const emptyFleet = await request(app)
      .get('/v1/fleet')
      .query({ type: 'vehicle' })
      .set(...auth(adminAccessToken))
      .expect(httpStatus.OK);
    expect(emptyFleet.body).toEqual([]);
    expect(emptyFleet.body.some((row) => row.id === 'VEH-01')).toBe(false);

    const createdVehicle = await request(app)
      .post('/v1/fleet')
      .set(...auth(adminAccessToken))
      .send({ type: 'vehicle', name: 'Volvo FH16', numberplate: 'GP 111 GP', yard: 'Durban Central Yard' })
      .expect(httpStatus.CREATED);
    expect(createdVehicle.body.name).toBe('Volvo FH16');
    expect(createdVehicle.body.numberplate).toBe('GP 111 GP');

    const vehicles = await request(app)
      .get('/v1/fleet')
      .query({ type: 'vehicle' })
      .set(...auth(adminAccessToken))
      .expect(httpStatus.OK);
    expect(vehicles.body).toHaveLength(1);
    expect(vehicles.body[0].numberplate).toBe('GP 111 GP');

    const createdTrailer = await request(app)
      .post('/v1/fleet')
      .set(...auth(adminAccessToken))
      .send({
        type: 'trailer',
        name: 'TNK-01',
        fields: { type: 'Tanker' },
        capacity: '30kl',
        yard: 'Durban Central Yard',
        status: 'available',
      })
      .expect(httpStatus.CREATED);
    expect(createdTrailer.body.fleetType).toBe('trailer');
    expect(createdTrailer.body.type).toBe('Tanker');
  });
});
