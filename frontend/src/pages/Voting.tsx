
import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { fetchCandidates, submitVote, Candidate } from "../services/vote";
import { useWebSocket } from "../context/WebSocketContext";
import Modal from "../components/common/Modal";

import { useParams } from 'react-router-dom';


interface Candidate {
  id: number;
  name: string;
  photo: string;
  shortDesc: string;
  longDesc: string;
}


export const Voting = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState({ title: "", description: "" });
  const { status, lastMessage } = useWebSocket();

  // Fetch candidates on component mount - Add after line ~17
  useEffect(() => {
    const getCandidates = async () => {
      try {
        const data = await fetchCandidates();
        // Transform the data if needed to match our interface
        const formattedCandidates = data.map((c: any) => ({
          id: c.id,
          name: c.name,
          photo: c.photo || 'https://via.placeholder.com/150',
          party: c.party,
          shortDesc: c.party || c.id,
          longDesc: `Candidate for ${c.party || 'Independent'}`
        }));
        setCandidates(formattedCandidates);
      } catch (error) {
        console.error("Failed to fetch candidates:", error);
        setModalMessage({
          title: "Error",
          description: "Failed to load candidates. Please try again."
        });
        setShowModal(true);
      }
    };

    getCandidates();
  }, []);

  // Listen for vote updates - Add after candidates useEffect
  useEffect(() => {
    if (lastMessage && lastMessage.event === 'vote_submitted') {
      setModalMessage({
        title: "Vote Received",
        description: `Your vote has been recorded with ID: ${lastMessage.vote_id}`
      });
      setShowModal(true);
    }
  }, [lastMessage]);

  // Update handleVote function at line ~17
  const handleVote = async () => {
    if (!selectedCandidate) return;
    
    setLoading(true);
    try {
      const result = await submitVote(selectedCandidate.id);
      setModalMessage({
        title: "Vote Submitted",
        description: `Your vote for ${selectedCandidate.name} has been submitted successfully!`
      });
      setShowModal(true);
    } catch (error: any) {
      setModalMessage({
        title: "Error",
        description: error.message || "Failed to submit vote. Please try again."
      });
      setShowModal(true);
    } finally {
      setLoading(false);
    }
  };

  // Add modal to your JSX before the return's first div (line ~29)
  return (
    <Layout showFooter={false} showSidebar={false}>
      {showModal && (
        <Modal
          title={modalMessage.title}
          description={modalMessage.description}
          onClose={() => setShowModal(false)}
          onConfirm={() => setShowModal(false)}
        />
      )}
      
      {/* Rest of your existing JSX */}
      
      {/* Update the vote button around line 87 */}
      <button
        className="p-4 bg-zinc-800 border border-solid border-zinc-700 rounded hover:scale-105 transition duration-300 cursor-pointer disabled:opacity-50"
        onClick={handleVote}
        disabled={loading}
      >
        {loading ? "Processing..." : "Vote for them"}
      </button>
    </Layout>
  );
};