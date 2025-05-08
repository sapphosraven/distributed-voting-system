import React from "react";
import { Navigate } from "react-router-dom";
import { getToken } from "../services/login";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const token = getToken();

  // if (!token) {
  //   // Redirect to login if there's no token
  //   return <Navigate to="/login" replace />;
  // }

  return <>{children}</>;
};

export default ProtectedRoute;
