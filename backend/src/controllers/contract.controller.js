const catchAsync = require('../utils/catchAsync');
const { companyService, contractService } = require('../services');

const getMyContracts = catchAsync(async (req, res) => {
  const company = await companyService.getOrCreateCompanyForUser(req.user);
  const contracts = await contractService.queryContractsByCompany(company.id);
  res.send(contracts);
});

const signMyContract = catchAsync(async (req, res) => {
  const company = await companyService.getOrCreateCompanyForUser(req.user);
  const contract = await contractService.signContract(company.id, req.params.contractId);
  res.send(contract);
});

module.exports = {
  getMyContracts,
  signMyContract,
};
