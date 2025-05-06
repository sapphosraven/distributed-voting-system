import { Routes, Route, Navigate } from 'react-router-dom'; // Note: from react-router-dom, not react-router
import Login from './pages/Login';
import { Voting } from './pages/Voting';
import { Result } from './pages/Result';
import { WebSocketProvider } from './context/WebSocketContext';
import ProtectedRoute from './components/ProtectedRoute';

// Rest of your component...
function App() {
  return (
    <WebSocketProvider>
      <Routes>
        <Route path='/login' element={<Login />} />
        <Route 
          path='/voting' 
          element={
            <ProtectedRoute>
              <Voting />
            </ProtectedRoute>
          } 
        />
        <Route 
          path='/result' 
          element={
            <ProtectedRoute>
              <Result />
            </ProtectedRoute>
          } 
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </WebSocketProvider>
  );
}

export default App;