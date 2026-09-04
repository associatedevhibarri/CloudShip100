const allRoles = {
  user: [],
  customer: [
    'viewOwnCompany',
    'manageOwnCompany',
    'viewOwnBookings',
    'manageOwnBookings',
    'viewOwnInvoices',
    'viewOwnContracts',
    'manageOwnContracts',
    'viewOwnDocuments',
    'manageOwnDocuments',
    'viewOwnPayments',
    'manageOwnPayments',
    'viewPromotions',
    'viewOwnNotifications',
  ],
  driver: [],
  operator: [
    'getUsers',
    'manageUsers',
    'manageWarehouse',
    'manageLeads',
    'manageGeofences',
    'managePricing',
    'viewPromotions',
    'managePromotions',
  ],
  admin: [
    'getUsers',
    'manageUsers',
    'manageWarehouse',
    'manageLeads',
    'manageGeofences',
    'managePricing',
    'viewPromotions',
    'managePromotions',
  ],
};

const roles = Object.keys(allRoles);
const roleRights = new Map(Object.entries(allRoles));

module.exports = {
  roles,
  roleRights,
};
