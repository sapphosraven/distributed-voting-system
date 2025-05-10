const crypto = require('crypto');

const privateKey = crypto.createPrivateKey({
  key: fs.readFileSync(process.env.RSA_PRIVATE_KEY_PATH),
  format: 'pem'
});
const publicKey = crypto.createPublicKey({
  key: fs.readFileSync(process.env.RSA_PUBLIC_KEY_PATH),
  format: 'pem'
});

exports.sign = data =>
  crypto.sign('sha256', Buffer.from(data), privateKey).toString('base64');

exports.verify = (data, sig) =>
  crypto.verify('sha256', Buffer.from(data), publicKey, Buffer.from(sig, 'base64'));
