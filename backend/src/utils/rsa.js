const NodeRSA = require('node-rsa');

const privateKey = process.env.RSA_PRIVATE_KEY;
const publicKey = process.env.RSA_PUBLIC_KEY;

const privateKeyInstance = new NodeRSA(privateKey);
const publicKeyInstance = new NodeRSA(publicKey);

exports.encrypt = (data) => {
  return publicKeyInstance.encrypt(data, 'base64');
};

exports.decrypt = (data) => {
  return privateKeyInstance.decrypt(data, 'utf8');
};
