const express = require('express');
const auth = require('../../middlewares/auth');
const contractController = require('../../controllers/contract.controller');

const router = express.Router();

router.get('/mine', auth('viewOwnContracts'), contractController.getMyContracts);

module.exports = router;
