import React, { useEffect, useState } from "react";
import { css } from "@emotion/react";
import styled from "@emotion/styled";
import { motion } from "framer-motion";
import DynamicBackground from "../components/DynamicBackground";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { handleAuthError } from "../utils/handleAuthError";

const Card = styled(motion.div)`
  background: rgba(24, 24, 42, 0.7);
  border: 1px solid rgba(66, 66, 122, 0.2);
  border-radius: 1rem;
  padding: 1.5rem;
  margin: 1rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(10px);
  color: var(--color-text);
`;

const Title = styled.h2`
  color: var(--color-purple);
  text-align: center;
  margin-bottom: 1.5rem;
`;

const Container = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  padding: 2rem;
`;

const ErrorMsg = styled.div`
  color: #ff4d4f;
  text-align: center;
  margin-top: 1rem;
`;

const LoadingMsg = styled.div`
  color: var(--color-orange);
  text-align: center;
  margin-top: 1rem;
`;

const Elections = () => {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchElections = async () => {
      console.log("[Elections] Fetching elections...");
      try {
        const res = await api.get("/elections", { withCredentials: true });
        console.log("[Elections] Fetched elections:", res.data);
        setElections(res.data);
      } catch (err) {
        if (!handleAuthError(err, navigate, setError)) {
          setError(err?.response?.data?.message || "Failed to fetch elections");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchElections();
  }, []);

  if (loading)
    return (
      <>
        <LoadingMsg>Loading elections...</LoadingMsg>
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <button
            style={{
              background: "#2d8cff",
              color: "#fff",
              border: "none",
              borderRadius: "0.5rem",
              padding: "0.7rem 1.5rem",
              fontWeight: 500,
              fontSize: "1.1rem",
              cursor: "pointer",
              marginBottom: "1rem",
            }}
            onClick={() => navigate("/create-election")}
          >
            + Create Election
          </button>
        </div>
      </>
    );
  if (error)
    return (
      <>
        <ErrorMsg>{error}</ErrorMsg>
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <button
            style={{
              background: "#2d8cff",
              color: "#fff",
              border: "none",
              borderRadius: "0.5rem",
              padding: "0.7rem 1.5rem",
              fontWeight: 500,
              fontSize: "1.1rem",
              cursor: "pointer",
              marginBottom: "1rem",
            }}
            onClick={() => navigate("/create-election")}
          >
            + Create Election
          </button>
        </div>
      </>
    );

  return (
    <>
      <DynamicBackground />
      <Title>Eligible Elections</Title>
      <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
        <button
          style={{
            background: "#2d8cff",
            color: "#fff",
            border: "none",
            borderRadius: "0.5rem",
            padding: "0.7rem 1.5rem",
            fontWeight: 500,
            fontSize: "1.1rem",
            cursor: "pointer",
            marginBottom: "1rem",
          }}
          onClick={() => navigate("/create-election")}
        >
          + Create Election
        </button>
      </div>
      <Container>
        {elections.map((election) => (
          <Card key={election.id}>
            <h3>{election.title}</h3>
            <p>{election.description}</p>
            <p>
              <strong>Start:</strong>{" "}
              {new Date(election.startTime).toLocaleString()}
            </p>
            <p>
              <strong>End:</strong>{" "}
              {new Date(election.endTime).toLocaleString()}
            </p>
            <p>
              <strong>Status:</strong> {election.status}
            </p>
          </Card>
        ))}
      </Container>
    </>
  );
};

export default Elections;
