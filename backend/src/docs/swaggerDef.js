const { version } = require('../../package.json');
const config = require('../config/config');

const swaggerDef = {
  openapi: '3.0.0',
  info: {
    title: 'CloudShip API',
    version,
    description: [
      'CloudShip logistics API. Full route list: `docs/api.md`.',
      '',
      '**Other projects (Lovable / custom stores):** Partner tag, plus `docs/partner-api.md`.',
      '',
      'JWT `bearerAuth` is for the CloudShip app. Store integrations use `x-cloudship-key`.',
    ].join('\n'),
    contact: {
      name: 'CloudShip',
      url: 'https://cloudship100.com',
    },
    license: {
      name: 'MIT',
      url: 'https://github.com/hibarriassistantdev/CloudShip100/blob/main/backend/LICENSE',
    },
  },
  servers: [
    {
      url: `http://localhost:${config.port}/v1`,
      description: 'Local',
    },
    {
      url: 'https://api.cloudship100.com/v1',
      description: 'Production',
    },
  ],
};

module.exports = swaggerDef;
