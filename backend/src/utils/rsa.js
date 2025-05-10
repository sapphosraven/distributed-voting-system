const fs = require('fs');
const NodeRSA = require('node-rsa');

const priv = fs.readFileSync(process.env.RSA_PRIVATE_KEY_PATH);
const pub = fs.readFileSync(process.env.RSA_PUBLIC_KEY_PATH);

const privateKey = new NodeRSA(priv);
const publicKey = new NodeRSA(pub);

exports.encrypt = data => publicKey.encrypt(data, 'base64');
exports.decrypt = data => privateKey.decrypt(data, 'utf8');
