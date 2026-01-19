// server/utils/validators.js

const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate AWS access key format
const isValidAccessKey = (accessKey) => {
  const accessKeyRegex = /^[A-Z0-9]{20}$/;
  return accessKeyRegex.test(accessKey);
};

// Validate AWS secret key format
const isValidSecretKey = (secretKey) => {
  const secretKeyRegex = /^[A-Za-z0-9/+=]{40}$/;
  return secretKeyRegex.test(secretKey);
};

// Validate MongoDB ObjectId
const isValidObjectId = (id) => {
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  return objectIdRegex.test(id);
};

// Validate password strength
const isStrongPassword = (password) => {
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

export {
  isValidEmail,
  isValidAccessKey,
  isValidSecretKey,
  isValidObjectId,
  isStrongPassword,
  isValidUrl
};