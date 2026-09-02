const allRoles = {
  user: [],
  customer: [
    'viewOwnCompany',
    'manageOwnCompany',
    'viewOwnBookings',
    'viewOwnInvoices',
    'viewOwnContracts',
    'viewOwnDocuments',
    'manageOwnDocuments',
    'viewOwnPayments',
    'manageOwnPayments',
    'viewPromotions',
    'viewOwnNotifications',
  ],
  operator: ['getUsers', 'manageUsers'],
  admin: ['getUsers', 'manageUsers'],
};

const roles = Object.keys(allRoles);
const roleRights = new Map(Object.entries(allRoles));

module.exports = {
  roles,
  roleRights,
};
