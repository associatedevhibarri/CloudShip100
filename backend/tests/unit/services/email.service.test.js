const mockSendTransacEmail = jest.fn();
const mockSendMail = jest.fn();

jest.mock('../../../src/config/config', () => ({
  env: 'test',
  email: {
    useBrevo: true,
    brevoApiKey: 'test-brevo-key',
    from: 'sender@example.com',
    fromName: 'CloudShip',
    smtp: {},
  },
  frontendUrl: 'https://cloudship.example',
}));

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({ sendMail: mockSendMail, verify: jest.fn() })),
}));

jest.mock('sib-api-v3-sdk', () => ({
  BrevoClient: jest.fn(() => ({
    transactionalEmails: { sendTransacEmail: mockSendTransacEmail },
  })),
}));

const config = require('../../../src/config/config');
const emailService = require('../../../src/services/email.service');

describe('email provider selection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    config.email.useBrevo = true;
    mockSendTransacEmail.mockResolvedValue({});
    mockSendMail.mockResolvedValue({});
  });

  test('sends transactional email through Brevo by default', async () => {
    await emailService.sendEmail('recipient@example.com', 'Subject', 'Text', '<p>Text</p>');

    expect(mockSendTransacEmail).toHaveBeenCalledWith({
      sender: { name: 'CloudShip', email: 'sender@example.com' },
      to: [{ email: 'recipient@example.com' }],
      subject: 'Subject',
      textContent: 'Text',
      htmlContent: '<p>Text</p>',
    });
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  test('uses SMTP when Brevo is disabled', async () => {
    config.email.useBrevo = false;

    await emailService.sendEmail('recipient@example.com', 'Subject', 'Text');

    expect(mockSendMail).toHaveBeenCalledWith({
      from: 'sender@example.com',
      to: 'recipient@example.com',
      subject: 'Subject',
      text: 'Text',
    });
    expect(mockSendTransacEmail).not.toHaveBeenCalled();
  });
});