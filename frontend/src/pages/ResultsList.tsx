import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { ElectionListItem } from "../types/election";
import { getVotedElections } from "../services/elections";
import { mockElections } from "../mocks/electionMocks"; // Remove in production
import Modal from "../components/common/Modal";

export const ResultsList = () => {
  const [elections, setElections] = useState<ElectionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState({ title: "", description: "" });
  
  const navigate = useNavigate();

  useEffect(() => {
    const fetchVotedElections = async () => {
      try {
        // Comment this and uncomment the API call when backend is ready
        // Filter mock elections to only those voted on
        setElections(mockElections.filter(e => e.hasVoted));
        setLoading(false);
        
        // Uncomment when backend is ready
        // const data = await getVotedElections();
        // setElections(data);
      } catch (err) {
        console.error("Failed to fetch voted elections:", err);
        setModalMessage({
          title: "Error",
          description: "Failed to load election results. Please try again."
        });
        setShowModal(true);
        setLoading(false);
      }
    };

    fetchVotedElections();
  }, []);

  const handleElectionClick = (electionId: string) => {
    navigate(`/results/${electionId}`);
  };

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-purple-800">Election Results</h1>
        
        {loading ? (
          <div className="flex justify-center my-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-700"></div>
          </div>
        ) : error ? (
          <div className="bg-red-100 p-4 rounded-md text-red-700">
            {error}
          </div>
        ) : elections.length === 0 ? (
          <div className="bg-gray-100 p-8 rounded-md text-center">
            <p>You haven't voted in any elections yet.</p>
            <button 
              className="mt-4 bg-purple-700 hover:bg-purple-800 text-white px-4 py-2 rounded-md"
              onClick={() => navigate('/elections')}
            >
              Browse Available Elections
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {elections.map(election => (
              <div 
                key={election.id}
                className="border border-gray-200 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleElectionClick(election.id)}
              >
                <div className="bg-purple-100 px-4 py-2 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-lg text-purple-800">{election.title}</h3>
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                      Voted
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-gray-600 mb-4">{election.description}</p>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">
                      Ended: {new Date(election.end_date).toLocaleDateString()}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      election.status === 'completed' ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {election.status === 'completed' ? 'Final Results' : 'Live Results'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8">
          <button 
            className="bg-purple-700 hover:bg-purple-800 text-white px-6 py-3 rounded-md font-medium"
            onClick={() => navigate('/elections')}
          >
            Back to Elections
          </button>
        </div>
      </div>
      
      {showModal && (
        <Modal
          title={modalMessage.title}
          description={modalMessage.description}
          onClose={() => setShowModal(false)}
        />
      )}
    </Layout>
  );
};

export default ResultsList;