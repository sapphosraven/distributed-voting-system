import { Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Voting } from './pages/Voting';
import { Result } from './pages/Result';
import ElectionsList from './pages/ElectionsList';
import ResultsList from './pages/ResultsList';
import CreateElection from './pages/CreateElection';
import ProtectedRoute from './components/ProtectedRoute';
import { useEffect } from 'react';

function App() {
  useEffect(() => {
    const token = localStorage.getItem('token');
    const path = window.location.pathname;
    
    // If not on login page and no token, redirect to login
    if (path !== '/login' && !token) {
      window.location.href = '/login';
    }
  }, []);
  
  return (
    <Routes>
     <Route path="/" element={<Navigate to="/login" replace />} />
      
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
  );
}

export default App;