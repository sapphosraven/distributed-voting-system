exports.register = async (req, res) => {
  // stub: create user, hash password, respond
};

exports.login = async (req, res) => {
  // stub: verify credentials, issue JWT
};

exports.requestOtp = async (req, res) => {
  // stub: generate OTP, store in Redis, send via SendGrid
};

exports.verifyOtp = async (req, res) => {
  // stub: check OTP in Redis, respond OK
};
