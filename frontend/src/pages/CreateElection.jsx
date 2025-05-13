import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import styled from "@emotion/styled";
import { motion } from "framer-motion";
import DynamicBackground from "../components/DynamicBackground";

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
        startTime: start,
        endTime: end,
        isResultsVisible: true,
        allowedDomains,
        allowedEmails,
        candidates: candidates.map((c) => ({
          name: c.name,
          party: c.party,
          description: c.description,
        })),
      };
      await axios.post("/api/elections", payload, { withCredentials: true });
      setSuccess("Election created!");
      setTimeout(() => navigate("/elections"), 1200);
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to create election");
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewJson = (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const filtered = allowedList.map((v) => v.trim()).filter(Boolean);
    const allowedDomains = filtered.filter(isDomain);
    const allowedEmails = filtered.filter(isEmail);
    const payload = {
      title,
      description,
      startTime: start,
      endTime: end,
      isResultsVisible: true,
      allowedDomains,
      allowedEmails,
      candidates: candidates.map((c) => ({
        name: c.name,
        party: c.party,
        description: c.description,
      })),
    };
    // Show in console
    console.log("[DEBUG] Election JSON payload:", payload);
    alert("Check the console for the JSON payload.");
  };

  const handlePreview = (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const err = validate();
    if (err) {
      setError(err);
      setShowPreview(false);
      return;
    }
    const filtered = allowedList.map((v) => v.trim()).filter(Boolean);
    const allowedDomains = filtered.filter(isDomain);
    const allowedEmails = filtered.filter(isEmail);
    const payload = {
      title,
      description,
      startTime: start,
      endTime: end,
      isResultsVisible: true,
      allowedDomains,
      allowedEmails,
      candidates: candidates.map((c) => ({
        name: c.name,
        party: c.party,
        description: c.description,
      })),
    };
    setPreviewJson(JSON.stringify(payload, null, 2));
    setShowPreview(true);
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
          <label>Election Description</label>
          <Textarea
            placeholder="Election Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
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
          <label>Allowed Domains or Emails (at least one required)</label>
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
              background: "#2d8cff",
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
            style={{ background: "#2d8cff", color: "#fff", marginBottom: 10 }}
          >
            + Add Candidate
          </Button>
          <Button
            type="button"
            onClick={handlePreviewJson}
            style={{
              background: "#ffa500",
              color: "#222",
              marginBottom: 10,
              width: "auto",
              padding: "0.5rem 1.2rem",
            }}
          >
            Preview JSON
          </Button>
          <Button
            type="button"
            onClick={handlePreview}
            style={{
              background: "#888",
              color: "#fff",
              marginBottom: 10,
              width: "auto",
              padding: "0.5rem 1.2rem",
              float: "right",
            }}
          >
            Preview JSON
          </Button>
          {showPreview && (
            <pre
              style={{
                background: "#18182a",
                color: "#fff",
                padding: "1rem",
                borderRadius: "0.5rem",
                margin: "1rem 0",
                fontSize: "0.95rem",
                overflowX: "auto",
                maxHeight: 300,
              }}
            >
              {previewJson}
            </pre>
          )}
          {error && <ErrorMsg>{error}</ErrorMsg>}
          {success && <SuccessMsg>{success}</SuccessMsg>}
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
