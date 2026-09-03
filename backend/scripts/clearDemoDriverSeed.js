require('../src/polyfills/slowBuffer');
const mongoose = require('mongoose');
const config = require('../src/config/config');
const { Trip, Parcel, DamageLog } = require('../src/models');

const DEMO_PARCELS = ['PRATIK1', 'DEEPAK2', 'PKG-8803', 'PKG-8804', 'PKG-8805'];
const DEMO_TRIPS = ['TRP-1001', 'TRP-1009', 'TRP-1010'];
const DEMO_DMG = ['DMG-001', 'DMG-002'];

const main = async () => {
  await mongoose.connect(config.mongoose.url, config.mongoose.options);
  const [parcels, trips, damageLogs] = await Promise.all([
    Parcel.deleteMany({ code: { $in: DEMO_PARCELS } }),
    Trip.deleteMany({ code: { $in: DEMO_TRIPS } }),
    DamageLog.deleteMany({ code: { $in: DEMO_DMG } }),
  ]);
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({
      clearedParcels: parcels.deletedCount,
      clearedTrips: trips.deletedCount,
      clearedDamageLogs: damageLogs.deletedCount,
    })
  );
  await mongoose.disconnect();
};

main().catch(async (err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
