const { verify } = require('../utils/signer');
module.exports = (req, res, next) => {
  // stub: verify(req.body.vote, req.headers['x-signature'])
  next();
};
