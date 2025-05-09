import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { getResults } from "../services/results";

export const Result = () => {
  const { electionId } = useParams<{ electionId: string }>();
  const [loading, setLoading] = useState(true);
  const [election, setElection] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      try {
        // Use real API
        const data = await getResults(electionId!);
        setElection(data);
      } catch (err) {
        setError("Failed to load election results");
      } finally {
        setLoading(false);
      }
    };
    if (electionId) fetchResults();
  }, [electionId]);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-700"></div>
        </div>
      </Layout>
    );
  }

  if (error || !election) {
    return (
      <Layout>
        <div className="p-6 max-w-4xl mx-auto">
          <div className="bg-red-100 p-4 rounded-md text-red-700 mb-4">
            {error || "Failed to load results"}
          </div>
          <button 
            className="px-4 py-2 bg-indigo-600 text-white rounded-md"
            onClick={() => navigate('/elections')}
          >
            Back to Elections
          </button>
        </div>
      </Layout>
    );
  }

  // Calculate percentages
  const totalVotes = election.total_votes;
  
  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-indigo-800">{election.title}</h1>
        <p className="text-gray-600 mb-8">{election.description}</p>
        
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-2xl font-semibold mb-4 text-indigo-700">Results</h2>
          <div className="mb-4 text-sm text-gray-500">
            Total votes: {totalVotes}
          </div>
          
          <div className="space-y-6">
            {election.votes.map((vote: any) => {
              const percentage = totalVotes > 0 
                ? Math.round((vote.count / totalVotes) * 100) 
                : 0;
              
              return (
                <div key={vote.candidate_id} className="mb-4">
                  <div className="flex justify-between mb-1">
                    <span className="font-medium">
                      {election.candidates.find((c: any) => c.id === vote.candidate_id)?.name || vote.name}
                    </span>
                    <span>{vote.count} votes ({percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div 
                      className="bg-indigo-600 h-4 rounded-full"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        <button 
          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md"
          onClick={() => navigate('/elections')}
        >
          Back to Elections
        </button>
      </div>
    </Layout>
  );
};

export default Result;