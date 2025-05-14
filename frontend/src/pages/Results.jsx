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
  width: 100%;
  max-width: none;
  min-width: 600px;
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

const ResultRow = styled.div`
  display: flex;
  flex-direction: column;
  background: rgba(34, 24, 54, 0.7);
  border-radius: 0.6rem;
  padding: 1rem 1.2rem;
  margin-bottom: 1rem;
  color: #fff;
  font-size: 1.08rem;
  font-weight: 500;
`;

const ResultTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const BarContainer = styled.div`
  width: 100%;
  margin-top: 0.7rem;
  display: flex;
  align-items: center;
`;

const Bar = styled.div`
  height: 18px;
  border-radius: 8px;
  background: #a98fff; /* Light purple */
  width: 100%;
`;

const ZeroVotesCircle = styled.div`
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #a98fff;
  display: inline-block;
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

const Results = () => {
  const { electionId } = useParams();
  const navigate = useNavigate();
  const [election, setElection] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchResults() {
      setLoading(true);
      setError("");
      try {
        // Fetch election info and results from correct backend endpoint
        const res = await api.get(`/vote/results/${electionId}`);
        // Backend returns: { electionId, title, candidates, tally, endTime, ... }
        setElection({ title: res.data.title, endTime: res.data.endTime });
        // Map tally to candidate objects for display
        const resultsArr = (res.data.candidates || []).map((c) => ({
          ...c,
          votes: res.data.tally ? res.data.tally[c.id] || 0 : 0,
        }));
        setResults(resultsArr);
      } catch (err) {
        if (!handleAuthError(err, navigate, setError)) {
          // Enhanced error handling for user-friendly messages
          let msg =
            err?.response?.data?.error ||
            err?.response?.data?.message ||
            err?.message ||
            "Failed to load results";
          // Map backend error to user-friendly message
          if (msg === "Not eligible for this election") {
            msg = "You are not allowed to view results for this election.";
          } else if (msg === "You must vote before viewing results") {
            msg = "You must vote before you can view the results.";
          } else if (msg === "Results not visible until election ends") {
            msg = "Results are hidden until the election ends.";
          }
          setError(msg);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchResults();
  }, [electionId]);

  // Helper to format date as local string
  function formatDateTimeLocal(dt) {
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

  // Calculate total votes for bar chart
  const totalVotes = results.reduce((sum, c) => sum + (c.votes || 0), 0);

  if (loading)
    return (
      <div style={{ color: "#fff", textAlign: "center", marginTop: 40 }}>
        Loading results...
      </div>
    );
  if (error)
    return (
      <Card
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 220,
        }}
      >
        <ErrorMsg style={{ marginBottom: 24, fontSize: "1.1rem" }}>
          {error}
        </ErrorMsg>
        <Button
          type="button"
          onClick={() => navigate("/elections")}
          style={{ background: "#444", color: "#fff", width: 220 }}
        >
          ← Back to Elections
        </Button>
      </Card>
    );

  return (
    <>
      <DynamicBackground />
      <Card
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        <Title>{election?.title || "Election Results"}</Title>
        {/* Provisional results message if election is live */}
        {election?.endTime && new Date() < new Date(election.endTime) && (
          <div
            style={{
              background: "#fffbe6",
              color: "#ad7b00",
              borderRadius: 8,
              padding: "0.8rem 1.2rem",
              marginBottom: 18,
              fontWeight: 500,
              textAlign: "center",
              fontSize: "1.08rem",
              border: "1px solid #ffe58f",
            }}
          >
            Results are provisional, will be finalized on{" "}
            {formatDateTimeLocal(election.endTime)}
          </div>
        )}
        {results.length === 0 ? (
          <div style={{ color: "#fff", textAlign: "center", margin: "2rem 0" }}>
            No results available yet.
          </div>
        ) : (
          results.map((c, idx) => (
            <ResultRow key={idx}>
              <ResultTop>
                <span>
                  <b>{c.name}</b>
                  {c.party && (
                    <span style={{ color: "#aaa", marginLeft: 8 }}>
                      ({c.party})
                    </span>
                  )}
                </span>
                <span
                  style={{ fontWeight: 700, minWidth: 32, textAlign: "right" }}
                >
                  {c.votes || 0}
                </span>
              </ResultTop>
              <BarContainer>
                {c.votes > 0 ? (
                  <Bar
                    style={{
                      width: totalVotes
                        ? `${Math.max(8, (c.votes / totalVotes) * 100)}%`
                        : "8%",
                    }}
                  />
                ) : (
                  <ZeroVotesCircle />
                )}
              </BarContainer>
            </ResultRow>
          ))
        )}
        <Button
          type="button"
          onClick={() => navigate("/elections")}
          style={{ background: "#444", color: "#fff", marginTop: 18 }}
        >
          ← Back to Elections
        </Button>
      </Card>
    </>
  );
};

export default Results;
