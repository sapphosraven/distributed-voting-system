import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { css } from "@emotion/react";
import styled from "@emotion/styled";
import { motion } from "framer-motion";
import api, { logout } from "../utils/api";
import { handleAuthError } from "../utils/handleAuthError";

const Card = styled(motion.div)`
  background: rgba(24, 24, 42, 0.7);
  border: 1px solid rgba(66, 66, 122, 0.2);
  border-radius: 1rem;
  padding: 2.5rem;
  max-width: 360px;
  width: 90%;
  margin: 10vh auto 0 auto;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(10px);
`;

const Title = styled.h2`
  color: var(--color-purple);
  margin-bottom: 1.8rem;
  text-align: center;
  font-weight: 500;
  letter-spacing: 0.5px;
`;

const Input = styled.input`
  width: calc(100% - 2rem);
  padding: 0.75rem 1rem;
  margin-bottom: 1.2rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-border);
  background: rgba(22, 22, 42, 0.5);
  color: var(--color-text);
  font-size: 1rem;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: var(--color-purple-muted);
    box-shadow: 0 0 0 2px rgba(128, 82, 176, 0.2);
  }
`;

const Button = styled.button`
  width: 100%;
  margin-bottom: 1rem;
  font-weight: 500;
  letter-spacing: 0.5px;
  transition: all 0.2s;
  background: var(--color-purple-muted);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 15px rgba(0, 0, 0, 0.15);
  }
`;

const OtpButton = styled(Button)`
  background: var(--color-orange-muted);
  opacity: 0.9;
`;

const ErrorMsg = styled.div`
  color: #ff4d4f;
  margin-bottom: 1rem;
  text-align: center;
  font-size: 0.9rem;
`;

const SuccessMsg = styled.div`
  color: #4caf50;
  margin-bottom: 1rem;
  text-align: center;
  font-size: 0.9rem;
`;

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    console.log("[Login] Attempting login", { email });
    try {
      const res = await api.post(
        "/auth/login",
        { email, password },
        { withCredentials: true }
      );
      console.log("[Login] Login response:", res);
      setSuccess("Login successful! OTP sent.");
      setTimeout(() => navigate("/verify-otp"), 1000); // Redirect to OTP after login
    } catch (err) {
      if (!handleAuthError(err, navigate, setError)) {
        setError(err?.response?.data?.message || "Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    setError("");
    setSuccess("");
    setLoading(true);
    console.log("[Login] Triggering OTP send", { email });
    try {
      const res = await api.post(
        "/auth/send-otp",
        { email },
        { withCredentials: true }
      );
      console.log("[Login] OTP send response:", res);
      setSuccess("OTP sent to your email.");
    } catch (err) {
      if (!handleAuthError(err, navigate, setError)) {
        setError(err?.response?.data?.message || "Failed to send OTP");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
    >
      <Title>Sign In</Title>
      <form onSubmit={handleLogin}>
        <Input
          type="email"
          placeholder="Email"
          value={email}
          autoComplete="username"
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          type="password"
          placeholder="Password"
          value={password}
          autoComplete="current-password"
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <ErrorMsg>{error}</ErrorMsg>}
        {success && <SuccessMsg>{success}</SuccessMsg>}
        <Button type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </Button>
      </form>
      <OtpButton
        type="button"
        onClick={handleSendOtp}
        disabled={loading || !email}
      >
        {loading ? "Sending OTP..." : "Send OTP to Email"}
      </OtpButton>
      <Button
        type="button"
        style={{ marginTop: "1rem", background: "#ff4d4f" }}
        onClick={() => {
          logout();
          navigate("/login");
        }}
      >
        Logout
      </Button>
      <div style={{ textAlign: "center", marginBottom: "1rem" }}>
        <a
          href="/reset-password-request"
          style={{
            color: "var(--color-orange)",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          Forgot Password?
        </a>
      </div>

      <div
        css={css`
          text-align: center;
          margin-top: 1.5rem;
          font-size: 0.9rem;
          opacity: 0.9;
        `}
      >
        <span>Don't have an account? </span>
        <a
          href="/register"
          css={css`
            color: var(--color-orange);
            text-decoration: none;
            font-weight: 500;
            transition: color 0.2s;
            &:hover {
              color: var(--color-purple);
            }
          `}
        >
          Register
        </a>
      </div>
    </Card>
  );
}
