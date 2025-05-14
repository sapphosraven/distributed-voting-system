# Security & Deployment Guide: Distributed Voting System

## 1. Digital Signatures for Votes
- **Key Files:**
  - `src/utils/signer.js`: Uses Node.js crypto, loads keys from `process.env.RSA_PRIVATE_KEY_PATH` and `process.env.RSA_PUBLIC_KEY_PATH`.
  - `src/middleware/sigVerifier.js`: Now verifies signatures using the public key. Rejects invalid or missing signatures.
  - `src/controllers/voteController.js`: Signs vote payloads before storing and responding.
  - `src/routes/vote.js`: Protects `/cast` route with signature verification middleware.
  - `secrets/private.pem`, `secrets/public.pem`: RSA keys (mounted as Docker secrets).

- **How to Test:**
  - Submit a vote with a valid signature: should succeed.
  - Submit a vote with an invalid or missing signature: should be rejected (400/401).

## 2. JWT Secret Management
- **Key Files:**
  - `src/controllers/authController.js`: Issues JWTs using `process.env.JWT_SECRET`.
  - `src/middleware/jwtAuth.js`: Verifies JWTs using `process.env.JWT_SECRET`.
  - `.env`: Do NOT hardcode JWT_SECRET. Set via Docker secret or environment variable.

- **How to Generate a Strong Secret:**
  - Run in PowerShell: `openssl rand -base64 64`
  - Set as environment variable or Docker secret.

- **How to Test:**
  - Use expired/invalid JWT: should be rejected.
  - Rotate secret: all old tokens become invalid.

## 3. HTTPS Configuration
- **Key Files:**
  - `src/index.js`: Uses HTTPS, loads cert/key from `process.env.HTTPS_KEY_PATH` and `process.env.HTTPS_CERT_PATH`.
  - `.env`: Set `HTTPS_KEY_PATH` and `HTTPS_CERT_PATH`.
  - `swarm-stack.yaml`: Mount cert/key as Docker secrets.
  - `frontend/src/utils/api.js`: Uses `https://` for API calls in production.

- **How to Generate Self-Signed Certs (for dev):**
  - PowerShell:
    ```powershell
    openssl req -x509 -newkey rsa:4096 -keyout https-key.pem -out https-cert.pem -days 365 -nodes -subj "/CN=localhost"
    ```
  - Mount these as `/secrets/https-key.pem` and `/secrets/https-cert.pem`.

- **How to Test:**
  - Access backend via `https://`.
  - Frontend API calls succeed over HTTPS.

## 4. General Security
- All secrets (JWT, RSA keys, HTTPS certs) must be excluded from version control.
- Only mount secrets at runtime (see `swarm-stack.yaml`).
- Test all flows: registration, login, OTP, voting, results, and error cases.

## References
- See `src/utils/replication.README.txt` for replication model.
- See `README.md` and `prompt.txt` for security model and requirements.

---
**For any deployment, review and update all environment variables, Docker secrets, and ensure HTTPS is enforced.**
