import { useEffect } from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import RecoverPassword from './pages/RecoverPassword';
import Dashboard from './pages/Dashboard';
import MatchMonitor from './pages/MatchMonitor';
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
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/monitor" element={<MatchMonitor />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster theme="dark" position="top-right" />
      </BrowserRouter>
    </div>
  );
}

export default App;
