import React from "react";
import { Navigate } from "react-router-dom";
import { isTokenExpired } from "../utils/api";

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  const otpVerified = localStorage.getItem("otpVerified") === "true";
  if (!token || isTokenExpired()) {
    return <Navigate to="/login" replace />;
  }
  if (!otpVerified) {
    return <Navigate to="/verify-otp" replace />;
  }
  return children;
};

export default ProtectedRoute;
