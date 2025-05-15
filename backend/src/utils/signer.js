const crypto = require("crypto");
const fs = require("fs");

const privateKey = crypto.createPrivateKey({
  key: fs.readFileSync(process.env.RSA_PRIVATE_KEY_PATH),
  format: "pem",
});
const publicKey = crypto.createPublicKey({
  key: fs.readFileSync(process.env.RSA_PUBLIC_KEY_PATH),
  format: "pem",
});

/**
 * Signs a payload string using the private key at the given path.
 * @param {string} payload - The string to sign (e.g. `${candidateId}:${electionId}:${userId}`)
 * @param {string} privateKeyPath - Path to the PEM private key file
 * @returns {string} The base64-encoded signature
 */
function signPayloadWithPemFile(
  payload,
  privateKeyPath = "backend/secrets/private.pem"
) {
  const privateKey = fs.readFileSync(privateKeyPath, "utf8");
  const sign = crypto.createSign("sha256");
  sign.update(payload);
  sign.end();
  return sign.sign(privateKey, "base64");
}

exports.sign = (data) =>
  crypto.sign("sha256", Buffer.from(data), privateKey).toString("base64");

exports.verify = (data, sig) =>
  crypto.verify(
    "sha256",
    Buffer.from(data),
    publicKey,
    Buffer.from(sig, "base64")
  );

module.exports = { signPayloadWithPemFile };
