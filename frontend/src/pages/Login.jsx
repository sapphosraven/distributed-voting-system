import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { css } from "@emotion/react";
import styled from "@emotion/styled";
import { motion } from "framer-motion";

const Card = styled(motion.div)`
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 1rem;
  padding: 2.5rem 2rem 2rem 2rem;
  max-width: 400px;
  margin: 6vh auto 0 auto;
  box-shadow: 0 4px 32px 0 rgba(42, 8, 69, 0.18);
`;
const Title = styled.h2`
  color: var(--color-purple);
  margin-bottom: 1.5rem;
  text-align: center;
`;
const Input = styled.input`
  width: 100%;
  padding: 0.75rem 1rem;
  margin-bottom: 1.2rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-border);
  background: var(--color-bg-darker);
  color: var(--color-text);
  font-size: 1rem;
`;
const Button = styled.button`
  width: 100%;
  margin-bottom: 1rem;
  font-weight: 600;
`;
const OtpButton = styled(Button)`
  background: linear-gradient(90deg, var(--color-orange), var(--color-purple));
`;
const ErrorMsg = styled.div`
  color: #ff4d4f;
  margin-bottom: 1rem;
  text-align: center;
`;
const SuccessMsg = styled.div`
  color: #4caf50;
  margin-bottom: 1rem;
  text-align: center;
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
      const res = await axios.post(
        "/api/auth/login",
        { email, password },
        { withCredentials: true }
      );
      console.log("[Login] Login response:", res);
      setSuccess("Login successful! OTP sent.");
      setTimeout(() => navigate("/verify-otp"), 1000);
    } catch (err) {
      console.error("[Login] Login error:", err);
      setError(err?.response?.data?.message || "Login failed");
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
      const res = await axios.post(
        "/api/auth/send-otp",
        { email },
        { withCredentials: true }
      );
      console.log("[Login] OTP send response:", res);
      setSuccess("OTP sent to your email.");
    } catch (err) {
      console.error("[Login] OTP send error:", err);
      setError(err?.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
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
      <div
        css={css`
          text-align: center;
          margin-top: 1rem;
        `}
      >
        <span>Don&apos;t have an account? </span>
        <a
          href="/register"
          css={css`
            color: var(--color-orange);
            text-decoration: none;
            font-weight: 600;
          `}
        >
          Register
        </a>
      </div>
    </Card>
  );
}
