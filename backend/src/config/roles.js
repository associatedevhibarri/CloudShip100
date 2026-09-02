const allRoles = {
  user: [],
  customer: [],
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

