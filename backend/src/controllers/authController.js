exports.register = async (req, res) => {
  // handle registration, generate OTP, send via email
};

exports.login = async (req, res) => {
  // handle login, likely generate JWT if OTP already verified
};

exports.requestOtp = async (req, res) => {
  // 1. generate OTP
  // 2. store OTP in Redis with expiry
  // 3. send OTP via SendGrid email
  // 4. respond with success
};

exports.verifyOtp = async (req, res) => {
  // 1. get OTP from request
  // 2. check Redis for OTP validity
  // 3. if valid, authenticate and issue JWT
};
