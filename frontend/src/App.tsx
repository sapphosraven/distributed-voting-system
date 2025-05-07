import { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Voting } from './pages/Voting';
import { Result } from './pages/Result';
import ElectionsList from './pages/ElectionsList';
import ResultsList from './pages/ResultsList';
import CreateElection from './pages/CreateElection';
import ProtectedRoute from './components/ProtectedRoute';
import WebSocketManager from './components/WebSocketManager';

function App() {
  const navigate = useNavigate();
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    const path = window.location.pathname;
    
    // Only redirect if not already on login page to prevent infinite loops
    if (path !== '/login' && !token) {
      navigate('/login', { replace: true });
    }
  }, [navigate]);
  
  const handleVoteUpdate = (data: any) => {
    console.log('Vote update in App:', data);
    // Could dispatch a global state update here if needed
  };
  
  return (
    <>
      <WebSocketManager onVoteUpdate={handleVoteUpdate} />
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={<Navigate to="/elections" replace />} />
        
        <Route path="/elections" element={
          <ProtectedRoute>
            <ElectionsList />
          </ProtectedRoute>
        } />
        
        <Route path="/voting/:electionId" element={
          <ProtectedRoute>
            <Voting />
          </ProtectedRoute>
        } />
        
        <Route path="/results" element={
          <ProtectedRoute>
            <ResultsList />
          </ProtectedRoute>
        } />
        
        <Route path="/results/:electionId" element={
          <ProtectedRoute>
            <Result />
          </ProtectedRoute>
        } />
        
        <Route path="/create-election" element={
          <ProtectedRoute>
            <CreateElection />
          </ProtectedRoute>
        } />
        
        <Route path="*" element={<Navigate to="/elections" replace />} />
      </Routes>
    </>
  );
}

export default App;