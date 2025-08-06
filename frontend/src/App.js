import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';

// Import components
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Transfer from './pages/Transfer';
import Transactions from './pages/Transactions';
import Budget from './pages/Budget';
import Admin from './pages/Admin';
import FileUpload from './pages/FileUpload';
import Chat from './components/Chat';

// Configure axios defaults
axios.defaults.baseURL = 'http://localhost:3001/api';
axios.defaults.withCredentials = true;

// VULNERABILITY: Global error handler that exposes sensitive information
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    // VULNERABILITY: Log full error details including request/response
    console.error('API Error:', {
      request: error.config,
      response: error.response?.data,
      stack: error.stack
    });
    
    // VULNERABILITY: Expose error details in global state
    window.buggyBankErrors = window.buggyBankErrors || [];
    window.buggyBankErrors.push({
      timestamp: new Date().toISOString(),
      url: error.config?.url,
      method: error.config?.method,
      data: error.config?.data,
      response: error.response?.data,
      headers: error.config?.headers
    });
    
    return Promise.reject(error);
  }
);

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    
    // VULNERABILITY: DOM-based XSS via location.hash
    if (window.location.hash) {
      const hashContent = window.location.hash.substring(1);
      const greetingElement = document.getElementById('greeting');
      if (greetingElement) {
        // VULNERABILITY: Direct innerHTML injection from URL hash
        greetingElement.innerHTML = `Welcome! ${hashContent}`;
      }
    }
  }, []);

  const checkAuth = async () => {
    try {
      const response = await axios.get('/auth/verify');
      setUser(response.data.user);
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = (userData) => {
    setUser(userData);
    
    // VULNERABILITY: Store sensitive user data in localStorage
    localStorage.setItem('buggybank_user', JSON.stringify(userData));
    localStorage.setItem('buggybank_last_login', new Date().toISOString());
  };

  const logout = async () => {
    try {
      await axios.post('/auth/logout');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setUser(null);
      // VULNERABILITY: Don't clear localStorage on logout
      // localStorage.removeItem('buggybank_user');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading BuggyBank...</div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        {/* VULNERABILITY: DOM-based XSS greeting element */}
        <div id="greeting" className="hidden"></div>
        
        <Navbar user={user} onLogout={logout} />
        
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route 
              path="/login" 
              element={user ? <Navigate to="/dashboard" /> : <Login onLogin={login} />} 
            />
            <Route 
              path="/register" 
              element={user ? <Navigate to="/dashboard" /> : <Register onLogin={login} />} 
            />
            <Route 
              path="/dashboard" 
              element={user ? <Dashboard user={user} /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/profile" 
              element={user ? <Profile user={user} setUser={setUser} /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/transfer" 
              element={user ? <Transfer user={user} /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/transactions" 
              element={user ? <Transactions user={user} /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/budget" 
              element={user ? <Budget user={user} /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/files" 
              element={user ? <FileUpload user={user} /> : <Navigate to="/login" />} 
            />
            {/* VULNERABILITY: Admin routes accessible to all authenticated users */}
            <Route 
              path="/admin/*" 
              element={user ? <Admin user={user} /> : <Navigate to="/login" />} 
            />
            <Route path="/" element={<Navigate to="/dashboard" />} />
          </Routes>
        </main>
        
        {/* WebSocket Chat Component */}
        {user && <Chat user={user} />}
      </div>
    </Router>
  );
}

export default App; 