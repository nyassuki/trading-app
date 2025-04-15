// utils/flashMessages.js
exports.collectFlashMessages = (req) => {
  const messages = {
    error: req.session.error,
    success: req.session.success,
    errors: req.session.errors,
    formData: req.session.formData || {}
  };

  // Clear them after collection
  delete req.session.error;
  delete req.session.success;
  delete req.session.errors;
  delete req.session.formData;

  return messages;
};
