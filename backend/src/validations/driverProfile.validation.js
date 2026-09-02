const Joi = require('joi');
const { validateProfileField } = require('../utils/driverProfileValidation');

const validatedString = (field) =>
  Joi.string()
    .trim()
    .allow('', null)
    .custom((value, helpers) => {
      if (value === '' || value === null || value === undefined) return value;
      const message = validateProfileField(field, value);
      if (message) return helpers.error('any.custom', { message });
      return value;
    });

const validatedExpiry = Joi.alternatives()
  .try(
    Joi.date().iso(),
    Joi.string().isoDate(),
    Joi.allow('', null)
  )
  .custom((value, helpers) => {
    if (value === '' || value === null || value === undefined) return value;
    const message = validateProfileField('licenceExpiry', value);
    if (message) return helpers.error('any.custom', { message });
    return value;
  });

const updateMyProfile = {
  body: Joi.object()
    .keys({
      contactEmail: validatedString('contactEmail'),
      phone: validatedString('phone'),
      address: validatedString('address'),
      nationalId: validatedString('nationalId'),
      licenseClass: validatedString('licenseClass'),
      licenceExpiry: validatedExpiry,
      emergencyContact: validatedString('emergencyContact'),
      emergencyPhone: validatedString('emergencyPhone'),
      restrictions: Joi.string().trim().allow('', null),
      assignedVehicle: Joi.string().trim().allow('', null),
    })
    .min(1)
    .messages({
      'any.custom': '{{#message}}',
    }),
};

const uploadDocument = {
  body: Joi.object().keys({
    type: Joi.string().valid('national_id', 'driving_license', 'other').required(),
  }),
};

const deleteDocument = {
  params: Joi.object().keys({
    documentId: Joi.string().required(),
  }),
};

module.exports = {
  updateMyProfile,
  uploadDocument,
  deleteDocument,
};
