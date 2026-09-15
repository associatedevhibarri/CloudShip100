const { Invoice } = require('../models');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const modeKey = (mode) => String(mode || '').toLowerCase();

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toISOString().slice(0, 10);
};

/**
 * Operator finance summary derived from invoices (receivables, not a bank wallet).
 * @returns {Promise<Object>}
 */
const getFinanceSummary = async () => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const activityStart = new Date(now.getFullYear(), now.getMonth() - 6, 1);

  const [paidAgg, openAgg, monthAgg, modeAgg, invoices] = await Promise.all([
    Invoice.aggregate([{ $match: { status: 'Paid' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Invoice.aggregate([{ $match: { status: 'Open' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Invoice.aggregate([
      { $match: { status: 'Paid', updatedAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Invoice.aggregate([
      { $match: { status: 'Paid', updatedAt: { $gte: activityStart } } },
      { $lookup: { from: 'bookings', localField: 'booking', foreignField: '_id', as: 'bookingDoc' } },
      { $unwind: { path: '$bookingDoc', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: {
            year: { $year: '$updatedAt' },
            month: { $month: '$updatedAt' },
            mode: '$bookingDoc.mode',
          },
          value: { $sum: '$amount' },
        },
      },
    ]),
    Invoice.find().populate('company', 'name').populate('booking', 'code mode').sort('-updatedAt').limit(50),
  ]);

  const byMode = [];
  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const bucket = { month: MONTHS[date.getMonth()], road: 0, air: 0, maritime: 0, rail: 0 };
    modeAgg.forEach((row) => {
      if (row._id.year !== year || row._id.month !== month) return;
      const key = modeKey(row._id.mode);
      if (Object.prototype.hasOwnProperty.call(bucket, key)) {
        bucket[key] += row.value || 0;
      }
    });
    byMode.push(bucket);
  }

  const transactions = invoices.map((invoice) => {
    const json = invoice.toJSON();
    const companyName = (json.company && json.company.name) || 'Customer';
    const code = (json.booking && json.booking.code) || '';
    return {
      id: json.id,
      date: formatDate(json.due),
      label: `${json.status === 'Paid' ? 'Collected' : 'Open'} — ${companyName}${code ? ` · ${code}` : ''}`,
      amount: Number(json.amount) || 0,
      status: json.status,
    };
  });

  return {
    collected: (paidAgg[0] && paidAgg[0].total) || 0,
    outstanding: (openAgg[0] && openAgg[0].total) || 0,
    monthlyCollected: (monthAgg[0] && monthAgg[0].total) || 0,
    byMode,
    transactions,
  };
};

module.exports = {
  getFinanceSummary,
};
