import { useEffect } from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import RecoverPassword from './pages/RecoverPassword';
import TeamSetup from './pages/TeamSetup';
import Dashboard from './pages/Dashboard';
import Monitor from './pages/Monitor';
import Plantel from './pages/Plantel';
import Estatisticas from './pages/Estatisticas';
import { Toaster } from './components/ui/sonner';

function App() {
  useEffect(() => {
    document.title = 'Futsal Time Hub';
  }, []);

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/recuperar-password" element={<RecoverPassword />} />
          <Route path="/team-setup" element={<TeamSetup />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/monitor" element={<Monitor />} />
          <Route path="/plantel" element={<Plantel />} />
          <Route path="/estatisticas" element={<Estatisticas />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster theme="dark" position="top-right" />
      </BrowserRouter>
    </div>
  );
}

export default App;
