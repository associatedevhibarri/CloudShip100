/**
 * One-shot writer for src/docs/routes.yml — all /v1 routes except those
 * already defined in partner.yml or auth/user JSDoc (those still appear in Swagger).
 * Duplicate path+method would overwrite; skip Partner + documented Auth/Users.
 */
const fs = require('fs');
const path = require('path');

const bearer = [{ bearerAuth: [] }];
const jwtRes = {
  200: { description: 'OK' },
  401: { $ref: '#/components/responses/Unauthorized' },
  403: { $ref: '#/components/responses/Forbidden' },
};
const created = {
  201: { description: 'Created' },
  400: { description: 'Validation or bad request' },
  401: { $ref: '#/components/responses/Unauthorized' },
  403: { $ref: '#/components/responses/Forbidden' },
};

const json = (schema, example) => ({
  required: true,
  content: {
    'application/json': {
      schema,
      ...(example ? { example } : {}),
    },
  },
});

const op = (tag, summary, opts = {}) => {
  const o = {
    tags: [tag],
    summary,
    responses: opts.responses || jwtRes,
  };
  if (opts.security !== false) o.security = opts.security || bearer;
  if (opts.description) o.description = opts.description;
  if (opts.parameters) o.parameters = opts.parameters;
  if (opts.requestBody) o.requestBody = opts.requestBody;
  return o;
};

const idParam = (name, inLoc = 'path') => ({
  in: inLoc,
  name,
  required: inLoc === 'path',
  schema: { type: 'string' },
});

const paths = {};

const add = (p, method, spec) => {
  if (!paths[p]) paths[p] = {};
  paths[p][method] = spec;
};

// --- Auth (missing from leftover JSDoc) ---
add('/auth/me', 'get', op('Auth', 'Current user'));
add('/auth/resend-verification-email', 'post', op('Auth', 'Resend verification email (public)', {
  security: false,
  requestBody: json({
    type: 'object',
    required: ['email'],
    properties: { email: { type: 'string', format: 'email' } },
  }),
  responses: { 204: { description: 'No content' }, 400: { description: 'Validation' } },
}));
add('/auth/ops/invite', 'post', op('Auth', 'Invite operator', {
  requestBody: json({
    type: 'object',
    required: ['name', 'email'],
    properties: { name: { type: 'string' }, email: { type: 'string', format: 'email' } },
  }),
  responses: created,
}));
['resend-invite', 'verify-email'].forEach((action) => {
  add(`/auth/ops/{userId}/${action}`, 'post', op('Auth', `Operator ${action.replace('-', ' ')}`, {
    parameters: [idParam('userId')],
  }));
});
add('/auth/customers/{userId}/verify-email', 'post', op('Auth', 'Force-verify customer email', {
  parameters: [idParam('userId')],
}));
add('/auth/customers/{userId}/resend-verify', 'post', op('Auth', 'Resend customer verify email', {
  parameters: [idParam('userId')],
}));

// --- Bookings ---
const bookingBody = json({
  type: 'object',
  required: ['pickup', 'dropoff', 'cargo', 'mode'],
  properties: {
    pickup: { type: 'string' },
    dropoff: { type: 'string' },
    cargo: { type: 'string' },
    mode: { type: 'string', enum: ['Road', 'Air', 'Maritime', 'Rail'] },
    weightKg: { type: 'number' },
    quoteId: { type: 'string' },
    partnerId: { type: 'string' },
    value: { type: 'number' },
    lengthCm: { type: 'number' },
    widthCm: { type: 'number' },
    heightCm: { type: 'number' },
    pickupDate: { type: 'string', example: '2026-09-20' },
    declaredValue: { type: 'number' },
  },
  description: 'Require weightKg or quoteId.',
});
add('/bookings/mine', 'get', op('Bookings', 'List my bookings'));
add('/bookings/mine', 'post', op('Bookings', 'Create my booking', { requestBody: bookingBody, responses: created }));
add('/bookings', 'get', op('Bookings', 'List all bookings (ops)', {
  parameters: [{ in: 'query', name: 'status', schema: { type: 'string', enum: ['pending', 'in_transit', 'completed', 'history'] } }],
}));
add('/bookings', 'post', op('Bookings', 'Create booking', { requestBody: bookingBody, responses: created }));

// --- Pricing rates (quote is in partner.yml) ---
add('/pricing/rates', 'get', op('Pricing', 'Get operator rate card'));
add('/pricing/rates', 'put', op('Pricing', 'Replace operator rate card', {
  requestBody: json({
    type: 'object',
    required: ['rates'],
    properties: {
      rates: {
        type: 'array',
        minItems: 1,
        maxItems: 4,
        items: {
          type: 'object',
          required: ['mode', 'baseFee', 'perKm', 'perKg'],
          properties: {
            mode: { type: 'string', enum: ['Road', 'Air', 'Maritime', 'Rail'] },
            baseFee: { type: 'number' },
            perKm: { type: 'number' },
            perKg: { type: 'number' },
            active: { type: 'boolean' },
          },
        },
      },
    },
  }),
}));

// --- Ecommerce JWT ---
add('/ecommerce/stores', 'get', op('Ecommerce', 'List connected stores'));
add('/ecommerce/stores', 'post', op('Ecommerce', 'Connect a store', {
  requestBody: json({
    type: 'object',
    required: ['platform', 'storeName', 'credentials'],
    properties: {
      platform: { type: 'string', enum: ['woocommerce', 'shopify', 'wix', 'lovable'] },
      storeName: { type: 'string' },
      storeUrl: { type: 'string' },
      credentials: { type: 'object' },
      webhookSecret: { type: 'string' },
      settings: { type: 'object' },
    },
  }),
  responses: created,
}));
add('/ecommerce/stores/{connectionId}', 'patch', op('Ecommerce', 'Update store connection', {
  parameters: [idParam('connectionId')],
  requestBody: json({ type: 'object' }),
}));
add('/ecommerce/stores/{connectionId}', 'delete', op('Ecommerce', 'Disconnect store', {
  parameters: [idParam('connectionId')],
}));
add('/ecommerce/stores/{connectionId}/orders', 'post', op('Ecommerce', 'Manually ingest an order', {
  parameters: [idParam('connectionId')],
  requestBody: json({ type: 'object' }),
  responses: created,
}));
add('/ecommerce/quotes', 'post', op('Ecommerce', 'Portal marketplace quote', {
  requestBody: json({
    type: 'object',
    required: ['pickup', 'dropoff', 'weightKg'],
    properties: {
      connectionId: { type: 'string' },
      pickup: { type: 'string' },
      dropoff: { type: 'string' },
      weightKg: { type: 'number' },
      mode: { type: 'string', enum: ['Road', 'Air', 'Maritime', 'Rail'] },
      currency: { type: 'string' },
      preferredPartner: { type: 'string' },
      lockPickup: { type: 'boolean' },
    },
  }),
  responses: created,
}));
add('/ecommerce/payments/config', 'get', op('Ecommerce', 'Payment publishable config'));
add('/ecommerce/bookings/{bookingId}/pay', 'post', op('Ecommerce', 'Create payment for a booking', {
  parameters: [idParam('bookingId')],
  requestBody: json({
    type: 'object',
    properties: { quoteId: { type: 'string' }, partner: { type: 'string' }, service: { type: 'string' } },
  }),
}));
add('/ecommerce/payments/{paymentIntentId}/confirm', 'post', op('Ecommerce', 'Confirm payment intent (no JWT)', {
  security: false,
  parameters: [idParam('paymentIntentId')],
  description: 'Identified by paymentIntentId. Completes courier book after pay.',
}));

// --- Platform webhooks ---
const connParams = [
  idParam('connectionId'),
  { in: 'query', name: 'connectionId', schema: { type: 'string' } },
  { in: 'header', name: 'x-cloudship-connection-id', schema: { type: 'string' } },
];
const hookBody = json({ type: 'object' });
['woocommerce', 'shopify', 'wix'].forEach((p) => {
  add(`/webhooks/${p}/orders`, 'post', op('Webhooks', `${p} order created`, {
    security: false,
    parameters: connParams.filter((x) => x.in !== 'path'),
    requestBody: hookBody,
    description: 'HMAC/JWT per platform. connectionId in query or header.',
    responses: { 201: { description: 'Created' }, 200: { description: 'Duplicate or ignored' }, 401: { description: 'Bad HMAC' } },
  }));
  add(`/webhooks/${p}/orders/{connectionId}`, 'post', op('Webhooks', `${p} order created (path id)`, {
    security: false,
    parameters: [idParam('connectionId')],
    requestBody: hookBody,
    responses: { 201: { description: 'Created' }, 200: { description: 'Duplicate or ignored' }, 401: { description: 'Bad HMAC' } },
  }));
  add(`/webhooks/${p}/rates`, 'post', op('Webhooks', `${p} checkout rates`, {
    security: false,
    parameters: connParams.filter((x) => x.in !== 'path'),
    requestBody: hookBody,
  }));
  add(`/webhooks/${p}/rates/{connectionId}`, 'post', op('Webhooks', `${p} checkout rates (path id)`, {
    security: false,
    parameters: [idParam('connectionId')],
    requestBody: hookBody,
  }));
});
add('/webhooks/stripe', 'post', op('Webhooks', 'Stripe payment_intent.succeeded', {
  security: false,
  parameters: [{ in: 'header', name: 'stripe-signature', required: true, schema: { type: 'string' } }],
}));

// --- Company ---
add('/companies', 'get', op('Companies', 'List companies'));
add('/companies/me', 'get', op('Companies', 'My company'));
add('/companies/me', 'patch', op('Companies', 'Update my company', {
  requestBody: json({
    type: 'object',
    properties: {
      contact: { type: 'string' },
      phone: { type: 'string' },
      tier: { type: 'string', enum: ['Standard', 'Growth', 'Enterprise'] },
    },
  }),
}));

// --- Drivers ---
add('/drivers', 'get', op('Drivers', 'List drivers (ops)'));
add('/drivers/locations', 'get', op('Drivers', 'Live driver locations (ops)'));
add('/drivers/{employeeId}/approval', 'patch', op('Drivers', 'Set driver approval', {
  parameters: [idParam('employeeId')],
  requestBody: json({
    type: 'object',
    required: ['approvalStatus'],
    properties: { approvalStatus: { type: 'string', enum: ['pending', 'active', 'rejected'] } },
  }),
}));
add('/drivers/me/location', 'post', op('Drivers', 'Ping my GPS', {
  requestBody: json({
    type: 'object',
    required: ['lat', 'lng'],
    properties: {
      lat: { type: 'number' },
      lng: { type: 'number' },
      heading: { type: 'number' },
      speed: { type: 'number' },
      accuracy: { type: 'number' },
      at: { type: 'string', format: 'date-time' },
    },
  }),
}));
add('/drivers/me/dashboard', 'get', op('Drivers', 'Driver dashboard'));
add('/drivers/me/profile', 'get', op('Drivers', 'My driver profile'));
add('/drivers/me/profile', 'patch', op('Drivers', 'Update my driver profile', {
  requestBody: json({ type: 'object' }),
}));
add('/drivers/me/trips', 'get', op('Drivers', 'My trips', {
  parameters: [{ in: 'query', name: 'bucket', schema: { type: 'string' } }],
}));
add('/drivers/me/parcels', 'get', op('Drivers', 'My parcels', {
  parameters: [{ in: 'query', name: 'status', schema: { type: 'string', enum: ['assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled'] } }],
}));
add('/drivers/me/parcels/{parcelCode}/status', 'patch', op('Drivers', 'Update parcel status', {
  parameters: [idParam('parcelCode')],
  requestBody: json({
    type: 'object',
    required: ['status'],
    properties: {
      status: { type: 'string', enum: ['picked_up', 'in_transit', 'delivered'] },
      recipientName: { type: 'string' },
      signatureName: { type: 'string' },
      notes: { type: 'string' },
      lat: { type: 'number' },
      lng: { type: 'number' },
    },
  }),
}));
add('/drivers/me/damage-logs', 'get', op('Drivers', 'My damage logs'));
add('/drivers/me/damage-logs', 'post', op('Drivers', 'Create damage log (multipart photo)', {
  requestBody: {
    required: true,
    content: {
      'multipart/form-data': {
        schema: {
          type: 'object',
          required: ['severity', 'description'],
          properties: {
            photo: { type: 'string', format: 'binary' },
            severity: { type: 'string', enum: ['minor', 'major'] },
            description: { type: 'string' },
            parcelId: { type: 'string' },
            tripId: { type: 'string' },
            location: { type: 'string' },
          },
        },
      },
    },
  },
}));
add('/drivers/me/history', 'get', op('Drivers', 'My history'));
add('/drivers/me/documents', 'post', op('Drivers', 'Upload document (multipart)', {
  requestBody: {
    required: true,
    content: {
      'multipart/form-data': {
        schema: {
          type: 'object',
          required: ['type', 'document'],
          properties: {
            document: { type: 'string', format: 'binary' },
            type: { type: 'string', enum: ['national_id', 'driving_license', 'other'] },
          },
        },
      },
    },
  },
}));
add('/drivers/me/documents/{documentId}', 'delete', op('Drivers', 'Delete my document', {
  parameters: [idParam('documentId')],
}));

// --- Warehouse ---
add('/warehouse', 'get', op('Warehouse', 'Warehouse snapshot'));
add('/warehouse/drivers', 'get', op('Warehouse', 'Registered drivers'));
add('/warehouse/parcels/auto-assign', 'post', op('Warehouse', 'Auto-assign parcels'));
['receive', 'label', 'dispatch'].forEach((action) => {
  add(`/warehouse/parcels/{parcelId}/${action}`, 'post', op('Warehouse', `${action} parcel`, {
    parameters: [idParam('parcelId')],
    requestBody: json({ type: 'object', properties: { lat: { type: 'number' }, lng: { type: 'number' } } }),
  }));
});
add('/warehouse/parcels/{parcelId}/batch', 'post', op('Warehouse', 'Add parcel to batch', {
  parameters: [idParam('parcelId')],
  requestBody: json({ type: 'object', required: ['batchId'], properties: { batchId: { type: 'string' } } }),
}));
add('/warehouse/parcels/{parcelId}/assign', 'post', op('Warehouse', 'Assign parcel to driver/fleet', {
  parameters: [idParam('parcelId')],
  requestBody: json({
    type: 'object',
    properties: {
      employeeId: { type: 'string' },
      fleetType: { type: 'string' },
      truck: { type: 'string' },
      driver: { type: 'string' },
      partner: { type: 'string' },
    },
  }),
}));
add('/warehouse/batches', 'post', op('Warehouse', 'Create batch', {
  requestBody: json({
    type: 'object',
    required: ['name', 'warehouse', 'destination'],
    properties: { name: { type: 'string' }, warehouse: { type: 'string' }, destination: { type: 'string' } },
  }),
  responses: created,
}));
add('/warehouse/batches/{batchId}/close', 'post', op('Warehouse', 'Close batch', {
  parameters: [idParam('batchId')],
}));
add('/warehouse/routes/auto-assign', 'post', op('Warehouse', 'Auto-assign routes'));
add('/warehouse/routes/{routeId}/optimize', 'post', op('Warehouse', 'Optimize route', {
  parameters: [idParam('routeId')],
}));
add('/warehouse/zones/evaluate', 'post', op('Warehouse', 'Evaluate zones at point', {
  requestBody: json({
    type: 'object',
    required: ['lat', 'lng'],
    properties: { lat: { type: 'number' }, lng: { type: 'number' } },
  }),
}));
add('/warehouse/zones/{zoneId}/toggle', 'post', op('Warehouse', 'Toggle zone', {
  parameters: [idParam('zoneId')],
  requestBody: json({ type: 'object', required: ['active'], properties: { active: { type: 'boolean' } } }),
}));

// --- Trips ---
add('/trips', 'get', op('Trips', 'List trips', {
  parameters: [
    { in: 'query', name: 'status', schema: { type: 'string' } },
    { in: 'query', name: 'mode', schema: { type: 'string', enum: ['road', 'air', 'maritime', 'rail'] } },
  ],
}));
add('/trips', 'post', op('Trips', 'Create trip', {
  requestBody: json({
    type: 'object',
    required: ['employeeId', 'cargo', 'pickup', 'dropoff'],
    properties: {
      employeeId: { type: 'string' },
      cargo: { type: 'string' },
      pickup: { type: 'string' },
      dropoff: { type: 'string' },
      vehicle: { type: 'string' },
      mode: { type: 'string', enum: ['road', 'air', 'maritime', 'rail'] },
      distanceKm: { type: 'number' },
      clientOrderId: { type: 'string' },
      status: { type: 'string' },
    },
  }),
  responses: created,
}));
add('/trips/{tripId}', 'patch', op('Trips', 'Update trip', {
  parameters: [idParam('tripId')],
  requestBody: json({ type: 'object' }),
}));
add('/trips/{tripId}/reassign', 'patch', op('Trips', 'Reassign trip', {
  parameters: [idParam('tripId')],
  requestBody: json({ type: 'object', required: ['employeeId'], properties: { employeeId: { type: 'string' } } }),
}));
add('/trips/{tripId}/cancel', 'post', op('Trips', 'Cancel trip', {
  parameters: [idParam('tripId')],
}));

// --- Fleet / expenses ---
add('/fleet', 'get', op('Fleet', 'List fleet assets', {
  parameters: [{ in: 'query', name: 'type', schema: { type: 'string', enum: ['yard', 'vehicle', 'trailer', 'equipment', 'check_in', 'rail_siding', 'locomotive', 'rail_yard'] } }],
}));
add('/fleet', 'post', op('Fleet', 'Create fleet asset', {
  requestBody: json({
    type: 'object',
    required: ['type'],
    properties: {
      type: { type: 'string', enum: ['yard', 'vehicle', 'trailer', 'equipment', 'check_in', 'rail_siding', 'locomotive', 'rail_yard'] },
      code: { type: 'string' },
      name: { type: 'string' },
      status: { type: 'string' },
    },
  }),
  responses: created,
}));
add('/expenses', 'get', op('Expenses', 'List expenses', {
  parameters: [{ in: 'query', name: 'kind', schema: { type: 'string', enum: ['fuel', 'yard_fee', 'airport_fee', 'salary'] } }],
}));
add('/expenses', 'post', op('Expenses', 'Create expense', {
  requestBody: json({
    type: 'object',
    required: ['kind'],
    properties: {
      kind: { type: 'string', enum: ['fuel', 'yard_fee', 'airport_fee', 'salary'] },
      date: { type: 'string', format: 'date-time' },
      period: { type: 'string' },
      asset: { type: 'string' },
      liters: { type: 'number' },
      cost: { type: 'number' },
      amount: { type: 'number' },
      location: { type: 'string' },
      yard: { type: 'string' },
      airport: { type: 'string' },
      description: { type: 'string' },
      person: { type: 'string' },
      role: { type: 'string' },
    },
  }),
  responses: created,
}));

// --- Finance / invoices / contracts / kyc / payments ---
add('/finance', 'get', op('Finance', 'Finance summary'));
add('/invoices', 'get', op('Invoices', 'All invoices (ops)'));
add('/invoices/mine', 'get', op('Invoices', 'My invoices'));
add('/contracts/mine', 'get', op('Contracts', 'My contracts'));
add('/contracts/{contractId}/sign', 'patch', op('Contracts', 'Sign my contract', {
  parameters: [idParam('contractId')],
}));
add('/kyc-documents/mine', 'get', op('KYC', 'My KYC documents'));
add('/kyc-documents/mine', 'post', op('KYC', 'Upload KYC document (multipart)', {
  requestBody: {
    required: true,
    content: {
      'multipart/form-data': {
        schema: {
          type: 'object',
          required: ['type', 'file'],
          properties: {
            file: { type: 'string', format: 'binary' },
            type: { type: 'string' },
            expiresAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  },
}));
add('/payment-requests/mine', 'get', op('Payments', 'My payment requests'));
add('/payment-requests/{paymentRequestId}/pay', 'patch', op('Payments', 'Pay a payment request', {
  parameters: [idParam('paymentRequestId')],
}));

// --- Notifications / promotions ---
add('/notifications', 'get', op('Notifications', 'All notifications (ops)'));
add('/notifications/mine', 'get', op('Notifications', 'My notifications'));
add('/notifications/{notificationId}/read', 'patch', op('Notifications', 'Mark read', {
  parameters: [idParam('notificationId')],
}));
add('/notifications/{notificationId}', 'delete', op('Notifications', 'Dismiss notification', {
  parameters: [idParam('notificationId')],
}));
add('/promotions', 'get', op('Promotions', 'List promotions'));
add('/promotions', 'post', op('Promotions', 'Create promotion', {
  requestBody: json({
    type: 'object',
    required: ['title', 'body'],
    properties: { title: { type: 'string' }, body: { type: 'string' }, tag: { type: 'string' } },
  }),
  responses: created,
}));

// --- Geofences ---
add('/geofences', 'get', op('Geofences', 'List geofences'));
add('/geofences', 'post', op('Geofences', 'Create geofence', {
  requestBody: json({
    type: 'object',
    required: ['name', 'scope', 'region', 'rule'],
    properties: {
      name: { type: 'string' },
      scope: { type: 'string', enum: ['country', 'province', 'radius'] },
      region: { type: 'string' },
      rule: { type: 'string' },
      radiusKm: { type: 'number' },
      exclusions: { type: 'array', items: { type: 'string' } },
      lat: { type: 'number' },
      lng: { type: 'number' },
      active: { type: 'boolean' },
    },
  }),
  responses: created,
}));
add('/geofences/evaluate', 'post', op('Geofences', 'Evaluate point', {
  requestBody: json({
    type: 'object',
    required: ['lat', 'lng'],
    properties: { lat: { type: 'number' }, lng: { type: 'number' } },
  }),
}));
add('/geofences/{geofenceId}', 'patch', op('Geofences', 'Update geofence', {
  parameters: [idParam('geofenceId')],
  requestBody: json({ type: 'object' }),
}));
add('/geofences/{geofenceId}', 'delete', op('Geofences', 'Delete geofence', {
  parameters: [idParam('geofenceId')],
}));

// --- Places / leads / dashboard / weather ---
add('/places/autocomplete', 'get', op('Places', 'Address autocomplete (public)', {
  security: false,
  parameters: [
    { in: 'query', name: 'q', schema: { type: 'string' } },
    { in: 'query', name: 'sessionToken', schema: { type: 'string' } },
    { in: 'query', name: 'country', schema: { type: 'string' } },
  ],
  responses: { 200: { description: 'OK' }, 429: { description: 'Rate limited' } },
}));
add('/places/details', 'get', op('Places', 'Place details (public)', {
  security: false,
  parameters: [
    { in: 'query', name: 'placeId', required: true, schema: { type: 'string' } },
    { in: 'query', name: 'sessionToken', schema: { type: 'string' } },
  ],
}));
add('/leads', 'post', op('Leads', 'Capture landing lead (public)', {
  security: false,
  requestBody: json({
    type: 'object',
    required: ['name', 'email', 'company', 'message'],
    properties: {
      name: { type: 'string' },
      email: { type: 'string', format: 'email' },
      company: { type: 'string' },
      message: { type: 'string' },
    },
  }),
  responses: created,
}));
add('/leads', 'get', op('Leads', 'List leads (ops)'));
add('/dashboard', 'get', op('Dashboard', 'Ops dashboard'));
add('/weather', 'get', op('Dashboard', 'Ops weather'));

const spec = {
  tags: [
    { name: 'Bookings', description: 'Customer shipments' },
    { name: 'Ecommerce', description: 'JWT store connections and payments' },
    { name: 'Webhooks', description: 'Woo / Shopify / Wix / Stripe inbound' },
    { name: 'Companies', description: 'Seller company profile' },
    { name: 'Drivers', description: 'Ops roster + driver portal' },
    { name: 'Warehouse', description: 'Parcels, batches, routes, zones' },
    { name: 'Trips', description: 'Ops trip board' },
    { name: 'Fleet', description: 'Assets' },
    { name: 'Expenses', description: 'Fuel / fees / salary' },
    { name: 'Finance', description: 'Finance summary' },
    { name: 'Invoices', description: 'Invoices' },
    { name: 'Contracts', description: 'Customer contracts' },
    { name: 'KYC', description: 'Customer documents' },
    { name: 'Payments', description: 'Payment requests' },
    { name: 'Notifications', description: 'In-app notifications' },
    { name: 'Promotions', description: 'Promos' },
    { name: 'Geofences', description: 'Geo rules' },
    { name: 'Places', description: 'Public address lookup' },
    { name: 'Leads', description: 'Landing leads' },
    { name: 'Dashboard', description: 'Ops overview' },
  ],
  paths,
};

const out = path.join(__dirname, '../src/docs/routes.yml');
fs.writeFileSync(out, JSON.stringify(spec, null, 2));
const ops = Object.values(paths).reduce((n, p) => n + Object.keys(p).length, 0);
console.log(`Wrote ${out} (${Object.keys(paths).length} paths, ${ops} operations)`);
