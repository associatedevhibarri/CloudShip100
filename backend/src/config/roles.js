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
  operator: ['getUsers', 'manageUsers', 'manageWarehouse', 'manageLeads', 'manageGeofences', 'managePricing'],
  admin: ['getUsers', 'manageUsers', 'manageWarehouse', 'manageLeads', 'manageGeofences', 'managePricing'],
};

const roles = Object.keys(allRoles);
const roleRights = new Map(Object.entries(allRoles));

module.exports = {
  roles,
  roleRights,
};
