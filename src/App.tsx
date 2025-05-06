import { Routes, Route } from 'react-router';
import Login from './pages/Login';
import Voting from './pages/Voting';
import Result from './pages/Result';

function App() {
  return (
    <>
      <Routes>
        <Route path='/login' element={<Login />} />
        <Route path='/voting' element={<Voting />} />
        <Route path='/result' element={<Result />} />
      </Routes>
    </>
  );
}

export default App;
