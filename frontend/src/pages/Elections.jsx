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

const Elections = () => {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [filter, setFilter] = useState("live");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchElections = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get("/elections", { withCredentials: true });
        setElections(res.data.elections || res.data || []);
      } catch (err) {
        setError("Failed to fetch elections");
      } finally {
        setLoading(false);
      }
    };
    fetchElections();
  }, []);

  const filteredElections = elections.filter((election) => {
    if (filter === "live") {
      return (
        election.status === "live" ||
        (new Date(election.startTime) <= new Date() &&
          new Date(election.endTime) > new Date())
      );
    } else if (filter === "completed") {
      return (
        election.status === "completed" ||
        new Date(election.endTime) <= new Date()
      );
    }
    return true;
  });

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <>
      <DynamicBackground />
      <Navbar>
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

      <Title>{filter === "live" ? "Live Elections" : "Completed Elections"}</Title>
      {loading && <LoadingMsg>Loading elections...</LoadingMsg>}
      {error && <ErrorMsg>{error}</ErrorMsg>}

      <Container>
        {!loading && !error && filteredElections.length === 0 && (
          <div style={{ color: "#fff", textAlign: "center", width: "100%" }}>
            No elections found.
          </div>
        )}
        {filteredElections.map((election) => (
          <Card key={election.id} whileHover={{ scale: 1.03 }}>
            <h3 style={{ color: "var(--color-purple)", marginBottom: 8 }}>
              {election.title}
            </h3>
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
            <NavLink
              style={{
                marginTop: 12,
                background: "#2d8cff",
                color: "#fff",
              }}
              onClick={() => navigate(`/vote/${election.id}`)}
            >
              Go to Vote
            </NavLink>
            <NavLink
              style={{
                marginTop: 8,
                background: "#a98fff",
                color: "#23234a",
              }}
              onClick={() => navigate(`/results/${election.id}`)}
            >
              View Results
            </NavLink>
          </Card>
        ))}
      </Container>
    </>
  );
};

export default Elections;
