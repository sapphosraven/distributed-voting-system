import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import { Voting } from './pages/Voting';
import { Result } from './pages/Result';
import { ElectionsList } from './pages/ElectionsList';
import { CreateElection } from './pages/CreateElection';
import { ProtectedRoute } from './components/ProtectedRoute'; // Keep only one import
import { WebSocketProvider } from './context/WebSocketContext';

// Rest of your component...
function App() {
  return (
    <WebSocketProvider>
      <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route path="/" element={<ProtectedRoute><ElectionsList /></ProtectedRoute>} />
      <Route path="/elections" element={<ProtectedRoute><ElectionsList /></ProtectedRoute>} />
      <Route path="/elections/create" element={<ProtectedRoute><CreateElection /></ProtectedRoute>} />
      <Route path="/elections/:id/vote" element={<ProtectedRoute><Voting /></ProtectedRoute>} />
      <Route path="/elections/:id/results" element={<ProtectedRoute><Result /></ProtectedRoute>} />
    </Routes>
    </WebSocketProvider>
  );
}

export default App;