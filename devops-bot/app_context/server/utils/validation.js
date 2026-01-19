const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate AWS access key format
const isValidAccessKey = (accessKey) => {
  // AWS access keys are 20 character alphanumeric strings
  const accessKeyRegex = /^[A-Z0-9]{20}$/;
  return accessKeyRegex.test(accessKey);
};

// Validate AWS secret key format
const isValidSecretKey = (secretKey) => {
  // AWS secret keys are 40 character base64 strings
  const secretKeyRegex = /^[A-Za-z0-9/+=]{40}$/;
  return secretKeyRegex.test(secretKey);
};

// Validate MongoDB ObjectId
const isValidObjectId = (id) => {
  // MongoDB ObjectId is a 24 hex character string
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  return objectIdRegex.test(id);
};

// Validate password strength
const isStrongPassword = (password) => {
  // Password should be at least 8 characters and include at least one:
  // uppercase letter, lowercase letter, number, and special character
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

// Validate URL format
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
};

module.exports = {
  isValidEmail,
  isValidAccessKey,
  isValidSecretKey,
  isValidObjectId,
  isStrongPassword,
  isValidUrl
};