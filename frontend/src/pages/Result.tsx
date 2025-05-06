// Replace lines 1-3 with these imports:
import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { getResults, ElectionResults } from '../services/results';
import { useWebSocket } from '../context/WebSocketContext';
import { useParams, useNavigate } from 'react-router-dom';

// Update the component function
export const Result = () => {
  const { id: electionId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [results, setResults] = useState<ElectionResults | null>(null);
  const [loading, setLoading] = useState(true);
  const { lastMessage } = useWebSocket();
  
  // Update the fetchResults function to use the election ID
  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      try {
        // Update to pass the election ID
        const data = await getResults(electionId);
        setResults(data);
      } catch (error) {
        console.error("Failed to fetch results:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchResults();
  }, [electionId]);
  // Update results when new votes come in
  useEffect(() => {
    if (lastMessage && (lastMessage.event === 'vote_submitted' || lastMessage.event === 'vote_finalized')) {
      // Refresh results
      getResults().then(data => setResults(data)).catch(console.error);
    }
  }, [lastMessage]);
  
  // Update your JSX to display the results from the API
  return (
    <Layout showFooter={false} showSidebar={false}>
      <div className='bg-zinc-950 h-full w-full'>
        <h1 className='text-3xl font-bold text-center pt-6'>Election Results</h1>
        
        {loading ? (
          <div className='flex justify-center items-center h-48'>
            <p>Loading results...</p>
          </div>
        ) : results ? (
          <div className='p-8'>
            <h2 className='text-xl mb-4'>Total Votes: {results.total_votes || 0}</h2>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
              {Object.entries(results.candidates || {}).map(([candidateId, votes]) => (
                <div key={candidateId} className='bg-zinc-900 p-4 rounded-lg'>
                  <h3 className='text-xl font-semibold'>{candidateId}</h3>
                  <p className='text-3xl font-bold text-purple-400'>{votes} votes</p>
                  <div className='w-full bg-gray-700 rounded-full h-2.5 mt-2'>
                    <div 
                      className='bg-purple-500 h-2.5 rounded-full' 
                      style={{ width: `${results.total_votes ? (votes / results.total_votes) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className='text-center mt-8'>No results available yet</p>
        )}
      </div>
    </Layout>
  );
};