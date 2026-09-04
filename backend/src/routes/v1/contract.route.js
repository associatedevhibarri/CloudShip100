const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const contractValidation = require('../../validations/contract.validation');
const contractController = require('../../controllers/contract.controller');

const router = express.Router();

router.get('/mine', auth('viewOwnContracts'), contractController.getMyContracts);
router.patch(
  '/:contractId/sign',
  auth('manageOwnContracts'),
  validate(contractValidation.sign),
  contractController.signMyContract
);

module.exports = router;
