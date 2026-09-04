const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const uploadKycDocument = require('../../middlewares/uploadKycDocument');
const kycDocumentValidation = require('../../validations/kycDocument.validation');
const kycDocumentController = require('../../controllers/kycDocument.controller');

const router = express.Router();

router
  .route('/mine')
  .get(auth('viewOwnDocuments'), kycDocumentController.getMyDocuments)
  .post(
    auth('manageOwnDocuments'),
    uploadKycDocument.single('file'),
    validate(kycDocumentValidation.upload),
    kycDocumentController.uploadMyDocument
  );

module.exports = router;
