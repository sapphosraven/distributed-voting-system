import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Login } from "./pages/Login";
import ElectionsList from "./pages/ElectionsList";
import ResultsList from "./pages/ResultsList";
import CreateElection from "./pages/CreateElection";
import ProtectedRoute from "./components/ProtectedRoute";
import { Register } from "./pages/Register";

function App() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const path = window.location.pathname;

    // Only redirect if not already on login page to prevent infinite loops
    if (path !== "/login" && path !== "/otp-verification" && !token) {
      // Use React Router's navigate instead of window.location
      // navigate("/login", { replace: true });
    }
  }, [navigate]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      {/* Remove or comment out OTP route for demo */}
      {/* <Route path="/otp-verification" element={<OtpVerification />} /> */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route
        path="/elections"
        element={
          <ProtectedRoute>
            <ElectionsList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/results"
        element={
          <ProtectedRoute>
            <ResultsList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/create-election"
        element={
          <ProtectedRoute>
            <CreateElection />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
