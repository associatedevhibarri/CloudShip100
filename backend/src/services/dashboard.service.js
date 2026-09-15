const { Booking, Company, Invoice, User, Trip } = require('../models');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const STATUS_MIX = [
  { key: 'pending', name: 'Pending', color: '#007BFF' },
  { key: 'in_transit', name: 'In transit', color: '#4DA3FF' },
  { key: 'completed', name: 'Completed', color: '#94A3B8' },
];

const modeKey = (mode) => String(mode || '').toLowerCase();

/**
 * Operator dashboard KPIs derived from live bookings, invoices, and companies.
 * @returns {Promise<Object>}
 */
const getOpsDashboard = async () => {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const activityStart = new Date(now.getFullYear(), now.getMonth() - 6, 1);

  const [paidAgg, statusAgg, newCustomers, activityAgg, drivers, driversOnTrip, pendingBookings, openInvoices] =
    await Promise.all([
      Invoice.aggregate([{ $match: { status: 'Paid' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Booking.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Company.countDocuments({ createdAt: { $gte: weekAgo } }),
      Booking.aggregate([
        { $match: { bookedAt: { $gte: activityStart } } },
        {
          $group: {
            _id: {
              year: { $year: '$bookedAt' },
              month: { $month: '$bookedAt' },
              mode: '$mode',
            },
            value: { $sum: '$value' },
          },
        },
      ]),
      User.countDocuments({ role: 'driver' }),
      Trip.countDocuments({ status: { $in: ['starting_soon', 'in_progress', 'ending_soon'] } }),
      Booking.countDocuments({ status: 'pending' }),
      Invoice.countDocuments({ status: 'Open' }),
    ]);

  const statusCounts = Object.fromEntries(statusAgg.map((row) => [row._id, row.count]));
  const pending = statusCounts.pending || 0;
  const inTransit = statusCounts.in_transit || 0;
  const completed = (statusCounts.completed || 0) + (statusCounts.history || 0);
  const totalBookings = pending + inTransit + completed;

  const countsByKey = { pending, in_transit: inTransit, completed };
  const statusMix = STATUS_MIX.map((item) => ({
    name: item.name,
    value: countsByKey[item.key],
    color: item.color,
    percent: totalBookings ? Math.round((countsByKey[item.key] / totalBookings) * 1000) / 10 : 0,
  }));

  const activity = [];
  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const bucket = { month: MONTHS[date.getMonth()], road: 0, air: 0, maritime: 0, rail: 0 };
    activityAgg.forEach((row) => {
      if (row._id.year !== year || row._id.month !== month) return;
      const key = modeKey(row._id.mode);
      if (Object.prototype.hasOwnProperty.call(bucket, key)) {
        bucket[key] += row.value || 0;
      }
    });
    activity.push(bucket);
  }

  return {
    kpis: {
      totalRevenue: (paidAgg[0] && paidAgg[0].total) || 0,
      deliveries: completed,
      newCustomers,
      inTransit,
      drivers,
      driversOnTrip,
      pendingBookings,
      openInvoices,
    },
    activity,
    statusMix,
    totalBookings,
  };
};

module.exports = {
  getOpsDashboard,
};
