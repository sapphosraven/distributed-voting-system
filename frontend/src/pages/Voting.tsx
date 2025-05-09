import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { getElectionDetails } from "../services/elections";
import { submitVote, fetchElectionCandidates } from "../services/vote";
import Modal from "../components/common/Modal";
import { Candidate } from "../types/election";

interface VotingParams {
  electionId: string;
}

export const Voting = () => {
  const { electionId } = useParams<keyof VotingParams>() as VotingParams;
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [electionTitle, setElectionTitle] = useState("");
  const [electionDesc, setElectionDesc] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState({ title: "", description: "" });
  const [confirmVoteModal, setConfirmVoteModal] = useState(false);
  const [voteSubmitting, setVoteSubmitting] = useState(false);

  useEffect(() => {
    const fetchElectionDetailsAndCandidates = async () => {
      try {
        const electionData = await getElectionDetails(electionId);
        setElectionTitle(electionData.title);
        setElectionDesc(electionData.description);
        // Prefer fetching candidates from dedicated endpoint if available
        try {
          const fetchedCandidates = await fetchElectionCandidates(electionId);
          setCandidates(fetchedCandidates);
        } catch {
          setCandidates(electionData.candidates || []);
        }
        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch election details:", error);
        setModalMessage({
          title: "Error",
          description: "Failed to load election details. Please try again."
        });
        setShowModal(true);
        setLoading(false);
      }
    };

    fetchElectionDetailsAndCandidates();
  }, [electionId]);

  const handleCandidateSelect = (candidateId: string) => {
    setSelectedCandidate(candidateId);
  };

  const handleVoteSubmit = () => {
    if (!selectedCandidate) {
      setModalMessage({
        title: "Selection Required",
        description: "Please select a candidate before voting."
      });
      setShowModal(true);
      return;
    }
    
    setConfirmVoteModal(true);
  };
  
  const confirmVote = async () => {
    if (!selectedCandidate) return;

    setVoteSubmitting(true);
    try {
      await submitVote(electionId, selectedCandidate);

      setModalMessage({
        title: "Success!",
        description: "Your vote has been recorded successfully."
      });
      setShowModal(true);
      setConfirmVoteModal(false);
    } catch (error: any) {
      setModalMessage({
        title: "Vote Failed",
        description: error?.message || "There was a problem recording your vote. Please try again."
      });
      setShowModal(true);
    } finally {
      setVoteSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-900"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 w-full">
        <h1 className="text-3xl font-bold mb-2 text-purple-800">{electionTitle}</h1>
        <p className="text-gray-600 mb-8">{electionDesc}</p>
        
        <h2 className="text-2xl font-semibold mb-4 text-purple-900">Select a Candidate</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {candidates.map(candidate => (
            <div 
              key={candidate.id}
              className={`border rounded-lg overflow-hidden cursor-pointer transition-all ${
                selectedCandidate === candidate.id 
                  ? 'border-purple-600 shadow-md ring-2 ring-purple-300' 
                  : 'border-gray-200 hover:shadow-md'
              }`}
              onClick={() => handleCandidateSelect(candidate.id)}
            >
              <div className="h-40 bg-gray-100 relative">
                <img 
                  src={candidate.photo || "https://via.placeholder.com/300x200?text=Candidate"} 
                  alt={candidate.name}
                  className="w-full h-full object-cover"
                />
                {selectedCandidate === candidate.id && (
                  <div className="absolute top-2 right-2 bg-purple-900 text-white rounded-full p-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-bold text-lg">{candidate.name}</h3>
                {candidate.party && (
                  <p className="text-sm text-gray-500 mb-2">{candidate.party}</p>
                )}
                {candidate.description && (
                  <p className="text-gray-700">{candidate.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex justify-between">
          <button 
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-3 rounded-md font-medium"
            onClick={() => navigate('/elections')}
          >
            Back to Elections
          </button>
          
          <button 
            className={`px-6 py-3 rounded-md font-medium ${
              selectedCandidate 
                ? 'bg-purple-900 hover:bg-purple-800 text-white' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            onClick={handleVoteSubmit}
            disabled={!selectedCandidate}
          >
            Submit Vote
          </button>
        </div>
      </div>
      
      {showModal && (
        <Modal
          title={modalMessage.title}
          description={modalMessage.description}
          onClose={() => {
            setShowModal(false);
            if (modalMessage.title === "Success!") {
              navigate(`/results/${electionId}`);
            }
          }}
          onConfirm={() => setShowModal(false)} // Provide a default or meaningful action for onConfirm
        />
      )}
      
      {confirmVoteModal && (
        <Modal
          title="Confirm Your Vote"
          description={`Are you sure you want to vote for ${candidates.find(c => c.id === selectedCandidate)?.name}? This action cannot be undone.`}
          onClose={() => setConfirmVoteModal(false)}
          onConfirm={() => setConfirmVoteModal(false)}
          actions={
            <>
              <button
                onClick={() => setConfirmVoteModal(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md mr-2"
                disabled={voteSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={confirmVote}
                className="bg-purple-900 hover:bg-purple-800 text-white px-4 py-2 rounded-md"
                disabled={voteSubmitting}
              >
                {voteSubmitting ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </span>
                ) : "Confirm Vote"}
              </button>
            </>
          }
        />
      )}
    </Layout>
  );
};

export default Voting;