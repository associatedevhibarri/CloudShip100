const httpStatus = require('http-status');
const { KycDocument, Notification, Company } = require('../models');
const ApiError = require('../utils/ApiError');
const cloudinaryService = require('./cloudinary.service');
const emailService = require('./email.service');
const logger = require('../config/logger');

const RENEWAL_WINDOW_DAYS = 30;

/**
 * Automated compliance classification: documents with no expiry are treated as compliant once
 * on file; documents past their expiry are non-compliant; documents inside the renewal window
 * are flagged as expiring so the customer gets a reminder.
 * @param {Date|null} expiresAt
 * @returns {'compliant'|'expiring'|'non_compliant'}
 */
const computeStatus = (expiresAt) => {
  if (!expiresAt) return 'compliant';
  const now = Date.now();
  const expiry = new Date(expiresAt).getTime();
  if (expiry <= now) return 'non_compliant';
  const renewalWindowMs = RENEWAL_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  if (expiry - now <= renewalWindowMs) return 'expiring';
  return 'compliant';
};

/**
 * Raise a renewal-reminder notification and email for a document that is expiring or lapsed.
 * @param {ObjectId} companyId
 * @param {KycDocument} doc
 * @param {'expiring'|'non_compliant'} status
 */
const raiseRenewalNotification = async (companyId, doc, status) => {
  if (doc.reminderStatus === status) return;

  await Notification.create({
    company: companyId,
    title: `${doc.type} needs renewal`,
    body:
      status === 'non_compliant'
        ? `${doc.type} has expired. Please upload a renewed document to stay compliant.`
        : `${doc.type} expires on ${new Date(doc.expiresAt).toISOString().slice(0, 10)}. Please renew it soon.`,
    type: 'kyc_renewal',
    unread: true,
  });

  const company = await Company.findById(companyId);
  if (company && company.email) {
    await emailService.sendKycReminderEmail({
      to: company.email,
      documentType: doc.type,
      expiresOn: doc.expiresAt ? new Date(doc.expiresAt).toISOString().slice(0, 10) : null,
    });
  }

  doc.reminderStatus = status;
  await doc.save();
};

const applyFreshStatus = async (doc) => {
  const freshStatus = computeStatus(doc.expiresAt);
  const worsened =
    freshStatus === 'non_compliant' || (freshStatus === 'expiring' && doc.status === 'compliant');
  if (freshStatus !== doc.status) {
    doc.status = freshStatus;
    await doc.save();
  }
  if (worsened) {
    await raiseRenewalNotification(doc.company, doc, freshStatus);
  }
  return doc;
};

/**
 * Get all KYC/FICA/AML documents for a company. Re-runs automated classification on every read
 * so statuses stay current as expiry dates approach, and raises a renewal-reminder notification
 * the first time a document newly becomes expiring or non-compliant.
 * @param {ObjectId} companyId
 * @returns {Promise<KycDocument[]>}
 */
const queryDocumentsByCompany = async (companyId) => {
  const documents = await KycDocument.find({ company: companyId }).sort('-uploadedAt');
  await Promise.all(documents.map((doc) => applyFreshStatus(doc)));
  return documents;
};

/**
 * Scan every KYC document with an expiry date and email companies whose files just entered
 * the renewal window or have lapsed. Safe to run on a timer.
 */
const scanExpiringDocuments = async () => {
  const documents = await KycDocument.find({ expiresAt: { $ne: null } });
  await Promise.all(
    documents.map(async (doc) => {
      try {
        await applyFreshStatus(doc);
      } catch (err) {
        logger.warn(`KYC expiry scan failed for ${doc.id}: ${err.message}`);
      }
    })
  );
  return documents.length;
};

/**
 * Store a newly uploaded compliance document on Cloudinary and run automated classification.
 * @param {ObjectId} companyId
 * @param {Object} body - { type, expiresAt? }
 * @param {Express.Multer.File} file
 * @returns {Promise<KycDocument>}
 */
const createDocument = async (companyId, body, file) => {
  if (!file?.buffer) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Document file is required');
  }

  const uploaded = await cloudinaryService.uploadBuffer(file.buffer, {
    folder: cloudinaryService.FOLDERS.kycDocuments,
    resourceType: 'auto',
  });

  const expiresAt = body.expiresAt || null;
  const status = computeStatus(expiresAt);
  const doc = await KycDocument.create({
    company: companyId,
    type: body.type,
    fileName: file.originalname,
    fileUrl: uploaded.url,
    mimeType: file.mimetype,
    size: uploaded.bytes || file.size,
    expiresAt,
    status,
  });

  if (status === 'expiring' || status === 'non_compliant') {
    await raiseRenewalNotification(companyId, doc, status);
  }

  return doc;
};

module.exports = {
  queryDocumentsByCompany,
  createDocument,
  scanExpiringDocuments,
};
