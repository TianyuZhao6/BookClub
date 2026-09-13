exports.passwordErrors = password => {
  if (typeof password !== 'string') return ['Password is required'];
  const errors = [];
  if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) errors.push('Password must be at least 8 characters and at most 72 bytes');
  if (/\s/.test(password)) errors.push('Password cannot contain spaces');
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9\s]/.test(password)) errors.push('Password must contain an upper case, lower case, special character, and number');
  return errors;
};
exports.validPreferences = value => Array.isArray(value) && value.length <= 40 && value.every(item => typeof item === 'string' && item.trim().length > 0 && item.length <= 80);
