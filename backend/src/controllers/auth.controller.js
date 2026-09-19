const crypto = require('crypto');
const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const logger = require('../config/logger');
const config = require('../config/config');
const ApiError = require('../utils/ApiError');
const { authService, userService, tokenService, emailService } = require('../services');

const sendVerifyEmailSafe = async (user) => {
  try {
    const verifyEmailToken = await tokenService.generateVerifyEmailToken(user);
    await emailService.sendVerificationEmail(user.email, verifyEmailToken);
  } catch (err) {
    logger.warn(`Verification email to ${user.email} failed: ${err.message}`);
  }
};

const opsInviteUrl = (token) =>
  `${config.frontendUrl}/reset-password?token=${encodeURIComponent(token)}&next=ops`;

const assertOpsUser = (user) => {
  if (!user || !['operator', 'admin'].includes(user.role)) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Operator not found');
  }
};

const issueOpsInvite = async (user) => {
  const resetPasswordToken = await tokenService.generateResetPasswordToken(user.email);
  try {
    await emailService.sendOperatorInviteEmail(user.email, user.name, resetPasswordToken);
  } catch (err) {
    logger.warn(`Operator invite email to ${user.email} failed: ${err.message}`);
  }
  return {
    user,
    inviteUrl: opsInviteUrl(resetPasswordToken),
    message: 'Invite ready. Share the link if the email does not arrive.',
  };
};

const register = catchAsync(async (req, res) => {
  const user = await userService.createUser(req.body);
  await sendVerifyEmailSafe(user);
  res.status(httpStatus.CREATED).send({
    user,
    message: 'Check your email to verify your account before signing in.',
  });
});

const inviteOperator = catchAsync(async (req, res) => {
  const tempPassword = `Cs${crypto.randomBytes(8).toString('hex')}9`;
  const user = await userService.createUser({ ...req.body, password: tempPassword, role: 'operator' });
  const payload = await issueOpsInvite(user);
  res.status(httpStatus.CREATED).send(payload);
});

const resendOperatorInvite = catchAsync(async (req, res) => {
  const user = await userService.getUserById(req.params.userId);
  assertOpsUser(user);
  const payload = await issueOpsInvite(user);
  res.send(payload);
});

const verifyOperatorEmail = catchAsync(async (req, res) => {
  const user = await userService.getUserById(req.params.userId);
  assertOpsUser(user);
  const updated = await userService.updateUserById(user.id, { isEmailVerified: true });
  const payload = await issueOpsInvite(updated);
  res.send({
    ...payload,
    message: 'Email marked verified. They still need the invite link to set a password, then they can sign in.',
  });
});

const customerVerifyUrl = (token) =>
  `${config.frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;

const assertCustomerUser = (user) => {
  if (!user || user.role !== 'customer') {
    throw new ApiError(httpStatus.NOT_FOUND, 'Customer not found');
  }
};

const issueCustomerVerify = async (user) => {
  const verifyEmailToken = await tokenService.generateVerifyEmailToken(user);
  try {
    await emailService.sendVerificationEmail(user.email, verifyEmailToken);
  } catch (err) {
    logger.warn(`Customer verification email to ${user.email} failed: ${err.message}`);
  }
  return {
    user,
    verifyUrl: customerVerifyUrl(verifyEmailToken),
    message: 'Verification ready. Share the link if the email does not arrive.',
  };
};

const verifyCustomerEmail = catchAsync(async (req, res) => {
  const user = await userService.getUserById(req.params.userId);
  assertCustomerUser(user);
  const updated = await userService.updateUserById(user.id, { isEmailVerified: true });
  res.send({
    user: updated,
    message: 'Customer email verified. They can sign in with their password.',
  });
});

const resendCustomerVerify = catchAsync(async (req, res) => {
  const user = await userService.getUserById(req.params.userId);
  assertCustomerUser(user);
  if (user.isEmailVerified) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Customer email is already verified');
  }
  const payload = await issueCustomerVerify(user);
  res.send(payload);
});

const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const user = await authService.loginUserWithEmailAndPassword(email, password);
  const tokens = await tokenService.generateAuthTokens(user);
  res.send({ user, tokens });
});

const logout = catchAsync(async (req, res) => {
  await authService.logout(req.body.refreshToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const refreshTokens = catchAsync(async (req, res) => {
  const tokens = await authService.refreshAuth(req.body.refreshToken);
  res.send({ ...tokens });
});

const forgotPassword = catchAsync(async (req, res) => {
  const resetPasswordToken = await tokenService.generateResetPasswordToken(req.body.email);
  await emailService.sendResetPasswordEmail(req.body.email, resetPasswordToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const resetPassword = catchAsync(async (req, res) => {
  await authService.resetPassword(req.query.token, req.body.password);
  res.status(httpStatus.NO_CONTENT).send();
});

const sendVerificationEmail = catchAsync(async (req, res) => {
  const verifyEmailToken = await tokenService.generateVerifyEmailToken(req.user);
  await emailService.sendVerificationEmail(req.user.email, verifyEmailToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const resendVerificationEmail = catchAsync(async (req, res) => {
  const user = await userService.getUserByEmail(req.body.email);
  if (user && !user.isEmailVerified) {
    await sendVerifyEmailSafe(user);
  }
  res.status(httpStatus.NO_CONTENT).send();
});

const verifyEmail = catchAsync(async (req, res) => {
  await authService.verifyEmail(req.query.token);
  res.status(httpStatus.NO_CONTENT).send();
});

const getMe = catchAsync(async (req, res) => {
  res.send(req.user);
});

module.exports = {
  register,
  inviteOperator,
  resendOperatorInvite,
  verifyOperatorEmail,
  verifyCustomerEmail,
  resendCustomerVerify,
  login,
  logout,
  refreshTokens,
  forgotPassword,
  resetPassword,
  sendVerificationEmail,
  resendVerificationEmail,
  verifyEmail,
  getMe,
};
