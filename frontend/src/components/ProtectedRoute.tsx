import { Navigate } from 'react-router-dom';
import { getToken } from '../config/api'; // Change this import from login.ts to config/api.ts

interface ProtectedRouteProps {
  children: JSX.Element;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const token = getToken();
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

export default ProtectedRoute;