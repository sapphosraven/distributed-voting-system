import React, { useEffect, useState } from "react";
import { css } from "@emotion/react";
import styled from "@emotion/styled";
import { motion } from "framer-motion";
import DynamicBackground from "../components/DynamicBackground";
import { useNavigate } from "react-router-dom";
import api, { logout } from "../utils/api";
import { FaSignOutAlt, FaBars } from "react-icons/fa";

// Styled Components
const Navbar = styled.nav`
  width: 100%;
  background: rgba(24, 24, 42, 0.95);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 2.5rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  position: sticky;
  top: 0;
  z-index: 10;
`;

const NavMenu = styled.div`
  position: relative;
`;

const MenuButton = styled.button`
  background: none;
  border: none;
  color: #fff;
  font-size: 1.5rem;
  cursor: pointer;
`;

const MenuDropdown = styled.div`
  position: absolute;
  top: 2.5rem;
  left: 0;
  background: #23234a;
  border-radius: 0.5rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.13);
  min-width: 200px;
  z-index: 20;
  display: ${({ open }) => (open ? "block" : "none")};
`;

const MenuItem = styled.div`
  padding: 0.8rem 1.2rem;
  color: #fff;
  cursor: pointer;
  border-radius: 0.5rem;
  &:hover {
    background: #2d2d5a;
  }
`;

const NavLink = styled.button`
  background: none;
  border: none;
  color: #fff;
  font-size: 1.1rem;
  font-weight: 500;
  cursor: pointer;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  &:hover {
    background: rgba(128, 82, 176, 0.08);
  }
`;

const LogoutBtn = styled.button`
  background: none;
  border: none;
  color: #ff4d4f;
  font-size: 1.5rem;
  cursor: pointer;
  margin-left: 1.5rem;
  display: flex;
  align-items: center;
  &:hover {
    color: #fff;
    background: #ff4d4f22;
    border-radius: 0.5rem;
  }
`;

const Card = styled(motion.div)`
  background: rgba(24, 24, 42, 0.7);
  border: 1px solid rgba(66, 66, 122, 0.2);
  border-radius: 1rem;
  padding: 1.5rem;
  margin: 1rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(10px);
  color: var(--color-text);
  min-width: 320px;
  max-width: 370px;
  flex: 1 1 320px;
`;

const Title = styled.h2`
  color: var(--color-purple);
  text-align: center;
  margin: 2rem 0 1rem;
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

const OrangeButton = styled.button`
  width: 100%;
  margin-top: 12px;
  background: var(--color-orange);
  color: #fff;
  border: none;
  border-radius: 0.5rem;
  font-size: 1.08rem;
  font-weight: 500;
  padding: 0.7rem 1.2rem;
  cursor: pointer;
  transition: all 0.2s;
  &:hover:enabled {
    filter: brightness(1.1);
    transform: translateY(-2px);
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const Elections = () => {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [filter, setFilter] = useState("live");
  const [voteStatus, setVoteStatus] = useState({}); // { [electionId]: true/false }
  const [showVoteMsg, setShowVoteMsg] = useState({}); // { [electionId]: true/false }
  const navigate = useNavigate();

  useEffect(() => {
    const fetchElections = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get("/elections", { withCredentials: true });
        const list = res.data.elections || res.data || [];
        setElections(list);
        // Fetch vote status for each election (mock: random for demo)
        // TODO: Replace with real API if available
        const status = {};
        list.forEach((e) => {
          // For demo, randomly assign voted/not voted
          status[e.id] =
            e.hasVoted !== undefined ? e.hasVoted : Math.random() > 0.5;
        });
        setVoteStatus(status);
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to fetch elections");
      } finally {
        setLoading(false);
      }
    };
    fetchElections();
  }, []);

  // Split elections by vote status
  const electionsNotVoted = elections.filter((e) => !voteStatus[e.id]);
  const electionsVoted = elections.filter((e) => voteStatus[e.id]);

  // Helper: get status string
  function getElectionStatus(e) {
    const now = new Date();
    const start = new Date(e.startTime);
    const end = new Date(e.endTime);
    if (now < start) return "Upcoming";
    if (now >= start && now < end) return "Live";
    return "Ended";
  }

  // Helper: format date
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

  // Handler for vote button click
  function handleVoteClick(election) {
    const now = new Date();
    const start = new Date(election.startTime);
    if (now < start) {
      setShowVoteMsg((prev) => ({ ...prev, [election.id]: true }));
      setTimeout(
        () => setShowVoteMsg((prev) => ({ ...prev, [election.id]: false })),
        2500
      );
      return;
    }
    navigate(`/vote/${election.id}`);
  }

  // Handler for results button
  function handleResultsClick(election) {
    navigate(`/results/${election.id}`);
  }

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <>
      <DynamicBackground />
      <Navbar className="navbar-fixed">
        <NavMenu onMouseLeave={() => setDropdownOpen(false)}>
          <MenuButton onClick={() => setDropdownOpen(!dropdownOpen)}>
            <FaBars />
          </MenuButton>
          <MenuDropdown open={dropdownOpen}>
            <MenuItem
              onClick={() => {
                setFilter("live");
                setDropdownOpen(false);
              }}
            >
              Live Elections
            </MenuItem>
            <MenuItem
              onClick={() => {
                setFilter("completed");
                setDropdownOpen(false);
              }}
            >
              Completed Elections
            </MenuItem>
            <MenuItem
              onClick={() => {
                navigate("/create-election");
                setDropdownOpen(false);
              }}
            >
              + Create Election
            </MenuItem>
          </MenuDropdown>
        </NavMenu>
        <div style={{ display: "flex", alignItems: "center" }}>
          <LogoutBtn onClick={handleLogout} title="Logout">
            <FaSignOutAlt />
          </LogoutBtn>
        </div>
      </Navbar>
      <Title>Vote Not Cast</Title>
      {loading && <LoadingMsg>Loading elections...</LoadingMsg>}
      {error && <ErrorMsg>{error}</ErrorMsg>}
      <Container>
        {!loading && !error && electionsNotVoted.length === 0 && (
          <div style={{ color: "#fff", textAlign: "center", width: "100%" }}>
            No elections found.
          </div>
        )}
        {electionsNotVoted.map((election) => {
          const status = getElectionStatus(election);
          const now = new Date();
          const start = new Date(election.startTime);
          const end = new Date(election.endTime);
          const canVote = now >= start && now < end;
          return (
            <Card key={election.id} whileHover={{ scale: 1.03 }}>
              <h3 style={{ color: "var(--color-purple)", marginBottom: 8 }}>
                {election.title}
              </h3>
              <p
                style={{ color: "#aaa", fontSize: "0.98rem", marginBottom: 4 }}
              >
                <b>Creator:</b> {election.creatorEmail || "-"}
              </p>
              <p>
                <b>Start:</b> {formatDateTime(election.startTime)}
              </p>
              <p>
                <b>End:</b> {formatDateTime(election.endTime)}
              </p>
              <p>
                <b>Status:</b> {status}
              </p>
              <OrangeButton
                disabled={!canVote}
                onClick={() => handleVoteClick(election)}
              >
                Vote
              </OrangeButton>
              <OrangeButton
                style={{ background: "#444", color: "#fff", marginTop: 8 }}
                onClick={() => handleResultsClick(election)}
              >
                View Results
              </OrangeButton>
              {showVoteMsg[election.id] && (
                <div
                  style={{
                    color: "#ffb366",
                    marginTop: 10,
                    fontWeight: 500,
                    fontSize: "1.01rem",
                  }}
                >
                  You cannot vote in the election before its start time
                </div>
              )}
            </Card>
          );
        })}
      </Container>
      <Title>Vote Cast</Title>
      <Container>
        {electionsVoted.length === 0 && (
          <div style={{ color: "#fff", textAlign: "center", width: "100%" }}>
            No elections found.
          </div>
        )}
        {electionsVoted.map((election) => {
          const status = getElectionStatus(election);
          return (
            <Card key={election.id} whileHover={{ scale: 1.03 }}>
              <h3 style={{ color: "var(--color-purple)", marginBottom: 8 }}>
                {election.title}
              </h3>
              <p
                style={{ color: "#aaa", fontSize: "0.98rem", marginBottom: 4 }}
              >
                <b>Creator:</b> {election.creatorEmail || "-"}
              </p>
              <p>
                <b>Start:</b> {formatDateTime(election.startTime)}
              </p>
              <p>
                <b>End:</b> {formatDateTime(election.endTime)}
              </p>
              <p>
                <b>Status:</b> {status}
              </p>
              <OrangeButton
                style={{ background: "#444", color: "#fff" }}
                onClick={() => handleResultsClick(election)}
              >
                View Results
              </OrangeButton>
            </Card>
          );
        })}
      </Container>
    </>
  );
};

export default Elections;
