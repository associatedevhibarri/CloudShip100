const Joi = require('joi');

const createBooking = {
  body: Joi.object()
    .keys({
      pickup: Joi.string().required().trim(),
      dropoff: Joi.string().required().trim(),
      cargo: Joi.string().required().trim(),
      mode: Joi.string().valid('Road', 'Air', 'Maritime', 'Rail').required(),
      weightKg: Joi.number().positive(),
      value: Joi.number().min(0),
      quoteId: Joi.string().trim(),
      partnerId: Joi.string().trim(),
      lengthCm: Joi.number().positive(),
      widthCm: Joi.number().positive(),
      heightCm: Joi.number().positive(),
      pickupDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
      declaredValue: Joi.number().min(0),
      collectionBuildingType: Joi.string().allow(''),
      deliveryBuildingType: Joi.string().allow(''),
      cargoCategory: Joi.string().allow(''),
      quantity: Joi.number().positive(),
      unit: Joi.string().allow(''),
      volumeM3: Joi.number().positive(),
      dimensionUnit: Joi.string().allow(''),
      cargoForm: Joi.string().allow(''),
      form: Joi.string().allow(''),
      flammable: Joi.boolean(),
      perishable: Joi.boolean(),
      fragile: Joi.boolean(),
      extraLabour: Joi.boolean(),
      requiresAdditionalLabour: Joi.boolean(),
      specialClassifications: Joi.array().items(Joi.string()),
      packagingMaterial: Joi.string().allow(''),
      packagingClassification: Joi.string().allow(''),
      bagWeightKg: Joi.number().positive().allow(null),
      bagTon: Joi.number().positive().allow(null),
    })
    .or('weightKg', 'value', 'quoteId'),
};

module.exports = {
  createBooking,
};
