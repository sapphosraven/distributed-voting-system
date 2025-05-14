import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../utils/api";
import styled from "@emotion/styled";
import { motion } from "framer-motion";
import DynamicBackground from "../components/DynamicBackground";
import { handleAuthError } from "../utils/handleAuthError";

const Card = styled(motion.div)`
  background: rgba(24, 24, 42, 0.7);
  border: 1px solid rgba(66, 66, 122, 0.2);
  border-radius: 1rem;
  padding: 2.5rem;
  max-width: 520px;
  width: 95%;
  margin: 6vh auto 0 auto;
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

const CandidateBtn = styled.button`
  width: 100%;
  margin-bottom: 1rem;
  padding: 1rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-border);
  background: ${({ selected }) =>
    selected ? "#3a225a" : "rgba(22,22,42,0.5)"};
  color: ${({ selected }) => (selected ? "#e0e0e0" : "var(--color-text)")};
  font-size: 1.1rem;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  & b,
  & span,
  & div {
    color: ${({ selected }) =>
      selected ? "#e0e0e0" : "var(--color-text)"} !important;
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
  font-size: 1.05rem;
  font-weight: 500;
`;

// Helper to format UTC date string as dd/mm/yyyy hh:mm am/pm
function formatDateTime(dt) {
  if (!dt) return "";
  const date = new Date(dt);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`;
}

// Helper to format UTC date string as dd/mm/yyyy hh:mm am/pm in local time
function formatDateTimeLocalFromUTCString(dtStr) {
  if (!dtStr) return "";
  // Parse as UTC, then convert to local
  // dtStr may be in 'M/D/YYYY, h:mm:ss AM/PM' (US locale)
  // new Date(dtStr + ' UTC') ensures it's parsed as UTC
  const date = new Date(dtStr + " UTC");
  if (isNaN(date.getTime())) return dtStr;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`;
}

const Vote = () => {
  const { electionId } = useParams();
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [election, setElection] = useState(null);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [voteError, setVoteError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function fetchElection() {
      setLoading(true);
      setError("");
      setVoteError(""); // Clear vote error on new election load
      try {
        // Fetch all elections, then find the one with the matching id
        const res = await api.get("/elections");
        const allElections = res.data.elections || res.data || [];
        const found = allElections.find(
          (e) => String(e.id) === String(electionId)
        );
        if (!found) throw new Error("Election not found");
        setElection(found);
        setCandidates(found.candidates || []);
      } catch (err) {
        if (!handleAuthError(err, navigate, setError)) {
          setError("Failed to load election info");
        }
      } finally {
        setLoading(false);
      }
    }
    fetchElection();
  }, [electionId]);

  const handleVote = (e) => {
    e.preventDefault();
    setVoteError("");
    if (selected == null) {
      setVoteError("Please select a candidate.");
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    setVoteError("");
    try {
      const votePayload = {
        electionId: electionId,
        candidate: candidates[selected]?.id,
        signature: "dummy-signature", // Replace with real signature if available
      };
      await api.post("/vote/cast", votePayload, { withCredentials: true });
      setSuccess("Vote cast successfully! Redirecting to results...");
      setTimeout(() => navigate(`/results/${electionId}`), 1500);
      return;
    } catch (err) {
      if (handleAuthError(err, navigate, setVoteError)) return;
      setVoteError(() => {
        // Show a soft error if voting has not started yet
        if (
          err?.response?.data?.error?.startsWith("Voting has not started yet.")
        ) {
          // Try to extract the date from the error string (format: Voting has not started yet. Voting opens at 5/14/2025, 12:16:00 PM)
          const match = err.response.data.error.match(
            /Voting opens at ([^"]+)/
          );
          if (match && match[1]) {
            // match[1] is in mm/dd/yyyy, hh:mm:ss AM/PM (US locale, UTC)
            const formatted = formatDateTimeLocalFromUTCString(match[1]);
            return "Voting has not started yet. Voting opens at: " + formatted;
          }
          return err.response.data.error;
        }
        // Show a user-friendly error if voting is attempted after the election end
        if (
          err?.response?.data?.error === "Election has ended. Voting is closed."
        ) {
          return "Voting is closed. This election has ended.";
        }
        return (
          err?.response?.data?.error ||
          err?.message ||
          "Failed to cast vote. Please try again."
        );
      });
      // Keep the confirmation dialog open for retry
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <div style={{ color: "#fff", textAlign: "center", marginTop: 40 }}>
        Loading...
      </div>
    );
  // Improved error UX: show user-friendly message and back button if not eligible
  if (error) {
    let userMsg = error;
    if (
      error === "Not eligible for this election" ||
      error === "You are not eligible to vote in this election" ||
      error === "Failed to load election info"
    ) {
      userMsg = "You are not eligible to vote in this election.";
    }
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 220,
        }}
      >
        <ErrorMsg style={{ marginBottom: 24, fontSize: "1.1rem" }}>
          {userMsg}
        </ErrorMsg>
        <Button
          type="button"
          onClick={() => navigate("/elections")}
          style={{ background: "#444", color: "#fff", width: 220 }}
        >
          ← Back to Elections
        </Button>
      </div>
    );
  }

  return (
    <>
      <DynamicBackground />
      <Card
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        <Title>{election?.title || "Vote"}</Title>

        <form onSubmit={handleVote}>
          {candidates.map((c, idx) => (
            <CandidateBtn
              key={idx}
              type="button"
              selected={selected === idx}
              onClick={() => setSelected(idx)}
            >
              <b>{c.name}</b>{" "}
              {c.party && <span style={{ color: "#aaa" }}>({c.party})</span>}
              <div style={{ fontSize: "0.95rem", color: "#bbb", marginTop: 2 }}>
                {c.description}
              </div>
            </CandidateBtn>
          ))}
          {/* Only show voteError here, above the submit button */}
          {voteError && <ErrorMsg>{voteError}</ErrorMsg>}
          <Button
            type="submit"
            style={{ background: "var(--color-purple)", color: "#fff" }}
          >
            Submit Vote
          </Button>
          <Button
            type="button"
            onClick={() => navigate("/elections")}
            style={{ background: "#444", color: "#fff", marginBottom: 18 }}
          >
            ← Back
          </Button>
        </form>
        {showConfirm && (
          <div
            style={{
              background: "#222",
              color: "#fff",
              padding: "1.2rem",
              borderRadius: "0.7rem",
              marginTop: 20,
              textAlign: "center",
              boxShadow: "0 2px 10px #0006",
            }}
          >
            {submitting ? (
              <div style={{ margin: 16 }}>Vote being confirmed...</div>
            ) : success ? (
              <SuccessMsg>{success}</SuccessMsg>
            ) : (
              <>
                <div style={{ marginBottom: 16 }}>
                  Are you sure you want to vote for{" "}
                  <b>{candidates[selected]?.name}</b>?
                </div>
                <Button
                  type="button"
                  style={{
                    background: "#ff8800",
                    color: "#fff",
                    marginBottom: 8,
                  }}
                  onClick={handleConfirm}
                >
                  Confirm Vote
                </Button>
                <Button
                  type="button"
                  style={{ background: "#444", color: "#fff" }}
                  onClick={() => {
                    setShowConfirm(false);
                    setVoteError("");
                  }}
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
        )}
      </Card>
    </>
  );
};

export default Vote;
