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
    'viewOwnEcommerce',
    'manageOwnEcommerce',
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
    'viewOwnEcommerce',
    'manageOwnEcommerce',
  ],
};

const roles = Object.keys(allRoles);
const roleRights = new Map(Object.entries(allRoles));

module.exports = {
  roles,
  roleRights,
};
