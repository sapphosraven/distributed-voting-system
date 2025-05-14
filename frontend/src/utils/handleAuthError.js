// Utility to handle auth/session errors (401/403/500) and redirect to login
import { logout } from "./api";

export function handleAuthError(err, navigate, setError) {
  const status = err?.response?.status || err?.status;
  const msg =
    err?.response?.data?.error ||
    err?.response?.data?.message ||
    err?.message ||
    "";
  if (status === 500 && /token|auth|session|jwt|otp/i.test(msg)) {
    logout();
    if (setError)
      setError("Session expired or login required. Please log in again.");
    setTimeout(() => navigate("/login", { replace: true }), 2000);
    return true;
  }
  return false;
}
