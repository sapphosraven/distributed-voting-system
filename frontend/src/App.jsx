import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import { Global, css } from "@emotion/react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyOtp from "./pages/VerifyOtp";
import Elections from "./pages/Elections";
import Vote from "./pages/Vote";
import Results from "./pages/Results";
import Dashboard from "./pages/Dashboard";
import CreateElection from "./pages/CreateElection";
import DynamicBackground from "./components/DynamicBackground";

function App() {
  return (
    <>
      <DynamicBackground />
      <Global
        styles={css`
          body {
            margin: 0;
            padding: 0;
            background: linear-gradient(120deg, #1a1333 0%, #23234a 100%);
            min-height: 100vh;
            font-family: "Inter", sans-serif;
          }
        `}
      />
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />
          <Route path="/elections" element={<Elections />} />
          <Route path="/vote/:electionId" element={<Vote />} />
          <Route path="/results/:electionId" element={<Results />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/create-election" element={<CreateElection />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;
