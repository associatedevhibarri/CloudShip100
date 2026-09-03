const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const leadService = require('../services/lead.service');

const createLead = catchAsync(async (req, res) => {
  const lead = await leadService.createLead(req.body);
  res.status(httpStatus.CREATED).send({
    id: lead.id,
    message: 'Lead received',
  });
});

const getLeads = catchAsync(async (req, res) => {
  const leads = await leadService.queryLeads();
  res.send(leads);
});

module.exports = {
  createLead,
  getLeads,
};
