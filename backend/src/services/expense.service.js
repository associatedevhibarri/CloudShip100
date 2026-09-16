const { Expense } = require('../models');

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const toPublic = (expense) => {
  const json = expense.toJSON();
  return {
    id: json.id,
    kind: json.kind,
    date: formatDate(json.date),
    period: json.period || '',
    asset: json.asset || '',
    liters: json.liters,
    cost: json.cost != null ? json.cost : json.amount,
    amount: json.amount != null ? json.amount : json.cost,
    location: json.location || '',
    yard: json.yard || '',
    airport: json.airport || '',
    description: json.description || '',
    person: json.person || '',
    role: json.role || '',
  };
};

const queryExpenses = async (kind) => {
  const filter = kind ? { kind } : {};
  const rows = await Expense.find(filter).sort({ date: -1, createdAt: -1 });
  return rows.map(toPublic);
};

const createExpense = async (body) => {
  const payload = { ...body };
  if (!payload.date) delete payload.date;
  const expense = await Expense.create(payload);
  return toPublic(expense);
};

module.exports = {
  queryExpenses,
  createExpense,
};
