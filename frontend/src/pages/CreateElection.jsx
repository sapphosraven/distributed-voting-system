import React, { useState } from "react";
import api from "../utils/api";
import { useNavigate } from "react-router-dom";
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

const Input = styled.input`
  width: 96%;
  padding: 0.75rem 1rem;
  margin-bottom: 1.2rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-border);
  background: rgba(22, 22, 42, 0.5);
  color: var(--color-text);
  font-size: 1rem;
  font-family: inherit;
`;

const Textarea = styled.textarea`
  width: 96%;
  padding: 0.75rem 1rem;
  margin-bottom: 1.2rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-border);
  background: rgba(22, 22, 42, 0.5);
  color: var(--color-text);
  font-size: 1rem;
  font-family: inherit;
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
  font-size: 0.9rem;
`;

const CandidateRow = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.7rem;
  align-items: center;
`;

const RemoveBtn = styled.button`
  background: #ff4d4f;
  color: #fff;
  border: none;
  border-radius: 0.3rem;
  padding: 0.3rem 0.7rem;
  cursor: pointer;
  font-size: 0.9rem;
`;

const ListRow = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.7rem;
  align-items: center;
`;

const ResultsCheckboxRow = styled.div`
  background: rgba(22, 22, 42, 0.5);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  padding: 1.1rem 1.2rem 1.1rem 1.2rem;
  margin-bottom: 1.2rem;
  display: flex;
  align-items: center;
  gap: 0.9rem;
`;

// Custom styled checkbox for results visibility
const CustomCheckboxWrapper = styled.label`
  display: flex;
  align-items: center;
  cursor: pointer;
  position: relative;
  user-select: none;
`;
const HiddenCheckbox = styled.input`
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
`;
const StyledCheckbox = styled.span`
  display: inline-block;
  width: 24px;
  height: 24px;
  border-radius: 8px;
  background: #2a1440;
  border: 2.5px solid #fff;
  margin-right: 0.9rem;
  position: relative;
  transition: box-shadow 0.2s;
  box-shadow: 0 2px 8px #0003;
  &:after {
    content: "";
    display: block;
    position: absolute;
    left: 6px;
    top: 2px;
    width: 8px;
    height: 14px;
    border: solid #fff;
    border-width: 0 4px 4px 0;
    opacity: 0;
    border-radius: 2px;
    transform: scale(0.8) rotate(45deg);
    transition: opacity 0.15s;
  }
`;
const CheckedCheckbox = styled(StyledCheckbox)`
  background: #3a225a;
  &:after {
    opacity: 1;
  }
`;

const CreateElection = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [allowedList, setAllowedList] = useState([""]);
  const [candidates, setCandidates] = useState([
    { name: "", party: "", description: "" },
    { name: "", party: "", description: "" },
  ]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewJson, setPreviewJson] = useState("");
  const [isResultsVisible, setIsResultsVisible] = useState(true);
  const navigate = useNavigate();

  const handleCandidateChange = (idx, field, value) => {
    setCandidates((prev) => {
      const arr = [...prev];
      arr[idx][field] = value;
      return arr;
    });
  };

  const addCandidate = () => {
    // Only add if all current candidate names are filled
    if (candidates.some((c) => !c.name.trim())) {
      setError("Please fill all candidate names before adding more.");
      return;
    }
    setCandidates((prev) => [
      ...prev,
      { name: "", party: "", description: "" },
    ]);
  };

  const removeCandidate = (idx) => {
    setCandidates((prev) =>
      prev.length > 2 ? prev.filter((_, i) => i !== idx) : prev
    );
  };

  const handleAllowedChange = (idx, value) => {
    setAllowedList((prev) => {
      const arr = [...prev];
      arr[idx] = value;
      return arr;
    });
  };

  const addAllowed = () => {
    // Only add if all current allowedList fields are filled
    if (allowedList.some((v) => !v.trim())) {
      setError(
        "Please fill all allowed domain/email fields before adding more."
      );
      return;
    }
    setAllowedList((prev) => [...prev, ""]);
  };

  const removeAllowed = (idx) =>
    setAllowedList((prev) =>
      prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev
    );

  // Helper: is email or domain
  const isEmail = (val) => {
    const v = val.trim();
    // Simple, robust email regex
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  };
  const isDomain = (val) => {
    const v = val.trim();
    // Accepts domains like example.com, sub.domain.co.uk, but not emails
    // Only allow domain if it does NOT contain '@' and does not start/end with '.' or '-'
    if (isEmail(v)) return false;
    if (v.includes("@")) return false;
    if (/^[.-]/.test(v) || /[.-]$/.test(v)) return false;
    // Only allow valid domain parts
    return /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/.test(v);
  };

  const validate = () => {
    if (!title.trim()) return "Title is required";
    if (!start || !end) return "Start and end time required";
    if (new Date(start) >= new Date(end)) return "Start must be before end";
    if (new Date(start) < new Date()) return "Start time must be in the future";
    if (candidates.length < 2) return "At least 2 candidates required";
    if (candidates.some((c) => !c.name.trim()))
      return "All candidates need a name (no empty candidate fields allowed)";
    // Check all allowedList entries are filled and valid, and no empty rows
    const filtered = allowedList.map((v) => v.trim());
    if (filtered.length === 0 || filtered.every((v) => !v))
      return "At least one allowed domain or email is required";
    if (filtered.some((v) => !v))
      return "No empty allowed domain/email fields allowed";
    // Fix: Only check validity for non-empty entries
    if (filtered.filter(Boolean).some((v) => !isEmail(v) && !isDomain(v)))
      return "Each entry must be a valid email or domain";
    return null;
  };

  // Convert local datetime to UTC ISO string for backend
  function toUtcIso(dt) {
    if (!dt) return dt;
    const date = new Date(dt);
    return new Date(
      date.getTime() - date.getTimezoneOffset() * 60000
    ).toISOString();
  }

  // Helper to format date as dd/mm/yyyy and time as hh:mm am/pm
  function formatDateTime(dt) {
    if (!dt) return "";
    const date = new Date(dt);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "pm" : "am";
    hours = hours % 12;
    if (hours === 0) hours = 12;
    return `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setLoading(true);
    try {
      const filtered = allowedList.map((v) => v.trim()).filter(Boolean);
      const allowedDomains = filtered.filter(isDomain);
      const allowedEmails = filtered.filter(isEmail);
      const payload = {
        title,
        description,
        startTime: toUtcIso(start),
        endTime: toUtcIso(end),
        isResultsVisible,
        allowedDomains,
        allowedEmails,
        candidates: candidates.map((c) => ({
          name: c.name,
          party: c.party,
          description: c.description,
        })),
      };
      await api.post("/elections", payload, { withCredentials: true });
      setSuccess("Election created!");
      setTimeout(() => navigate("/elections"), 1000); // Redirect after 1s
    } catch (err) {
      if (!handleAuthError(err, navigate, setError)) {
        setError(err?.response?.data?.error || "Failed to create election");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DynamicBackground />
      <Card
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        <Title>Create Election</Title>
        <form onSubmit={handleSubmit}>
          <label>
            Election Title <span style={{ color: "red" }}>*</span>
          </label>
          <Input
            type="text"
            placeholder="Election Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          {/* Removed Election Description field */}
          <label>
            Start Date & Time <span style={{ color: "red" }}>*</span>
          </label>
          <Input
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            required
          />
          <label>
            End Date & Time <span style={{ color: "red" }}>*</span>
          </label>
          <Input
            type="datetime-local"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            required
          />
          <label>
            Allowed Domains or Emails <span style={{ color: "red" }}>*</span>{" "}
            (at least one required)
          </label>
          {allowedList.map((entry, idx) => (
            <ListRow key={"allowed-" + idx}>
              <Input
                type="text"
                placeholder="e.g. example.com or user@example.com"
                value={entry}
                onChange={(e) => handleAllowedChange(idx, e.target.value)}
                required
                style={{ flex: 2 }}
              />
              {allowedList.length > 1 && (
                <RemoveBtn
                  type="button"
                  onClick={() => removeAllowed(idx)}
                  title="Remove entry"
                >
                  ×
                </RemoveBtn>
              )}
            </ListRow>
          ))}
          <Button
            type="button"
            onClick={addAllowed}
            style={{
              background: "#ff8800",
              color: "#fff",
              marginBottom: 10,
              width: "auto",
              padding: "0.5rem 1.2rem",
            }}
          >
            + Add Domain or Email
          </Button>
          <div style={{ margin: "1.2rem 0 0.5rem 0", fontWeight: 500 }}>
            Candidates <span style={{ color: "red" }}>*</span> (at least 2, each
            must have a name)
          </div>
          {candidates.map((c, idx) => (
            <CandidateRow key={idx}>
              <Input
                type="text"
                placeholder="Name"
                value={c.name}
                onChange={(e) =>
                  handleCandidateChange(idx, "name", e.target.value)
                }
                required
                style={{ flex: 2 }}
              />
              <Input
                type="text"
                placeholder="Party (optional)"
                value={c.party}
                onChange={(e) =>
                  handleCandidateChange(idx, "party", e.target.value)
                }
                style={{ flex: 1 }}
              />
              <Input
                type="text"
                placeholder="Description (optional)"
                value={c.description}
                onChange={(e) =>
                  handleCandidateChange(idx, "description", e.target.value)
                }
                style={{ flex: 2 }}
              />
              {candidates.length > 2 && (
                <RemoveBtn
                  type="button"
                  onClick={() => removeCandidate(idx)}
                  title="Remove candidate"
                >
                  ×
                </RemoveBtn>
              )}
            </CandidateRow>
          ))}
          <Button
            type="button"
            onClick={addCandidate}
            style={{ background: "#ff8800", color: "#fff", marginBottom: 10 }}
          >
            + Add Candidate
          </Button>
          {error && <ErrorMsg>{error}</ErrorMsg>}
          {success && <SuccessMsg>{success}</SuccessMsg>}
          <ResultsCheckboxRow>
            <CustomCheckboxWrapper>
              <HiddenCheckbox
                type="checkbox"
                id="isResultsVisible"
                checked={isResultsVisible}
                onChange={(e) => setIsResultsVisible(e.target.checked)}
              />
              {isResultsVisible ? <CheckedCheckbox /> : <StyledCheckbox />}
              <span
                style={{
                  color: "var(--color-text)",
                  fontSize: "1.05rem",
                  marginLeft: 2,
                }}
              >
                Allow results to be visible before the election ends{" "}
                <span style={{ color: "red" }}>*</span>
              </span>
            </CustomCheckboxWrapper>
          </ResultsCheckboxRow>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Election"}
          </Button>
          <Button
            type="button"
            onClick={() => navigate("/elections")}
            style={{
              background: "#444",
              color: "#fff",
              marginBottom: 18,
              width: "auto",
              padding: "0.5rem 1.2rem",
            }}
          >
            ← Back
          </Button>
        </form>
      </Card>
    </>
  );
};

export default CreateElection;
