const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const companyValidation = require('../../validations/company.validation');
const companyController = require('../../controllers/company.controller');

const router = express.Router();

router
  .route('/me')
  .get(auth('viewOwnCompany'), companyController.getMyCompany)
  .patch(auth('manageOwnCompany'), validate(companyValidation.updateMyCompany), companyController.updateMyCompany);

module.exports = router;
