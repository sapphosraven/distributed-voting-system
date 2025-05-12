import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Layout from "../components/Layout";
import { ElectionListItem } from "../types/election";
import { getEligibleElections } from "../services/elections";
import Modal from "../components/common/Modal";

export const ElectionsList = () => {
  const [elections, setElections] = useState<ElectionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState({ title: "", description: "" });
  const [activeTab, setActiveTab] = useState<'active' | 'past'>('active');
  
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Set activeTab based on query param
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab === 'past') setActiveTab('past');
    else setActiveTab('active');
  }, [location.search]);

  useEffect(() => {
    const fetchElections = async () => {
      try {
        const data = await getEligibleElections();
        setElections(data as ElectionListItem[]);
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch elections:", err);
        setModalMessage({
          title: "Error",
          description: "Failed to load elections. Please try again."
        });
        setShowModal(true);
        setLoading(false);
      }
    };
    fetchElections();
  }, []);

  const filteredElections = elections.filter(election => {
    if (activeTab === 'active') {
      return election.status !== 'completed';
    }
    return election.status === 'completed';
  });

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-900"></div>
        </div>
      </Layout>
    );
  }

  if (elections.length === 0) {
    return (
      <Layout>
        <div className="bg-gray-100 p-8 rounded-md text-center">
          No elections available. Create a new election to get started.
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-purple-800">Available Elections</h1>
        <div className="flex space-x-4 mb-6">
          <button 
            className={`px-4 py-2 rounded-md ${activeTab === 'active' 
              ? 'bg-purple-900 text-white' 
              : 'bg-gray-200 text-gray-700'}`}
            onClick={() => setActiveTab('active')}
          >
            Active Elections
          </button>
          <button 
            className={`px-4 py-2 rounded-md ${activeTab === 'past' 
              ? 'bg-purple-900 text-white' 
              : 'bg-gray-200 text-gray-700'}`}
            onClick={() => setActiveTab('past')}
          >
            Past Elections
          </button>
        </div>
        {loading ? (
          <div className="flex justify-center my-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-900"></div>
          </div>
        ) : showModal ? (
          <div className="bg-red-100 p-4 rounded-md text-red-700">
            {modalMessage.description}
          </div>
        ) : filteredElections.length === 0 ? (
          <div className="bg-gray-100 p-8 rounded-md text-center">
            No {activeTab} elections available.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredElections.map(election => (
              <div 
                key={election.id}
                className="border border-gray-200 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div className="bg-purple-100 px-4 py-2 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-lg text-purple-800">{election.title}</h3>
                    {election.hasVoted && (
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                        Voted
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-gray-600 mb-4">{election.description}</p>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">
                      Ends: {new Date(election.end_date).toLocaleDateString()}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      election.status === 'active' ? 'bg-green-100 text-green-800' :
                      election.status === 'upcoming' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {election.status === 'active' ? 'Active' : 
                       election.status === 'upcoming' ? 'Upcoming' : 'Completed'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-8">
          <button 
            className="bg-purple-900 hover:bg-purple-800 text-white px-6 py-3 rounded-md font-medium flex items-center"
            onClick={() => navigate('/create-election')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Create New Election
          </button>
        </div>
      </div>
      {showModal && (
        <Modal
          title={modalMessage.title}
          description={modalMessage.description}
          onClose={() => setShowModal(false)}
          onConfirm={() => {
            setShowModal(false);
            console.log("Confirmed");
          }}
        />
      )}
    </Layout>
  );
};

export default ElectionsList;