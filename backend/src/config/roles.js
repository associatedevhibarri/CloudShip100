const allRoles = {
  user: [],
  customer: [
    'viewOwnCompany',
    'manageOwnCompany',
    'viewOwnBookings',
    'manageOwnBookings',
    'viewOwnInvoices',
    'viewOwnContracts',
    'viewOwnDocuments',
    'manageOwnDocuments',
    'viewOwnPayments',
    'manageOwnPayments',
    'viewPromotions',
    'viewOwnNotifications',
  ],
  driver: [],
  operator: ['getUsers', 'manageUsers', 'manageWarehouse'],
  admin: ['getUsers', 'manageUsers', 'manageWarehouse'],
};

const roles = Object.keys(allRoles);
const roleRights = new Map(Object.entries(allRoles));

module.exports = {
  roles,
  roleRights,
};
