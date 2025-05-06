import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { fetchElections, Election } from '../services/elections';

export const ElectionsList = () => {
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const getElections = async () => {
      setLoading(true);
      try {
        const data = await fetchElections();
        setElections(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch elections:', err);
        setError('Failed to load elections. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    getElections();
  }, []);

  const handleElectionClick = (election: Election) => {
    if (election.has_voted) {
      navigate(`/elections/${election.id}/results`);
    } else {
      navigate(`/elections/${election.id}/vote`);
    }
  };

  const handleCreateElection = () => {
    navigate('/elections/create');
  };

  return (
    <Layout>
      <div className="p-6 bg-gradient-to-b from-[#28003e] via-[#400057] to-[#5b006b] min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-white">Available Elections</h1>
            <button
              onClick={handleCreateElection}
              className="bg-gradient-to-r from-[#400057] via-[rgb(66,25,84)] to-[rgb(109,32,97)] py-2 px-4 rounded-lg hover:scale-105 transition duration-300"
            >
              Create Election
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center my-12">
              <p className="text-white">Loading elections...</p>
            </div>
          ) : error ? (
            <div className="bg-red-500 text-white p-4 rounded-lg mb-4">
              {error}
            </div>
          ) : elections.length === 0 ? (
            <div className="bg-zinc-800 rounded-lg p-8 text-center">
              <p className="text-xl text-white">No elections available at this time.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {elections.map((election) => (
                <div
                  key={election.id}
                  onClick={() => handleElectionClick(election)}
                  className="bg-zinc-800 rounded-lg p-6 cursor-pointer hover:bg-zinc-700 transition duration-300"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-semibold text-white">{election.title}</h3>
                      <p className="text-gray-300 mt-1">{election.description}</p>
                      <div className="mt-3 text-sm text-gray-400">
                        <p>Ends on: {new Date(election.end_date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className={`${election.has_voted ? 'bg-green-500' : 'bg-purple-500'} text-white rounded-full py-1 px-3 text-sm`}>
                      {election.has_voted ? 'Voted' : 'Not Voted'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};