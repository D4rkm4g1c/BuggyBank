import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function Navbar({ user, onLogout }) {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-blue-600 text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <Link to="/" className="text-xl font-bold">
            🏦 BuggyBank
          </Link>
          
          {user ? (
            <div className="flex items-center space-x-6">
              <Link 
                to="/dashboard" 
                className={`hover:text-blue-200 ${isActive('/dashboard') ? 'border-b-2' : ''}`}
              >
                Dashboard
              </Link>
              <Link 
                to="/transfer" 
                className={`hover:text-blue-200 ${isActive('/transfer') ? 'border-b-2' : ''}`}
              >
                Transfer
              </Link>
              <Link 
                to="/transactions" 
                className={`hover:text-blue-200 ${isActive('/transactions') ? 'border-b-2' : ''}`}
              >
                Transactions
              </Link>
              <Link 
                to="/budget" 
                className={`hover:text-blue-200 ${isActive('/budget') ? 'border-b-2' : ''}`}
              >
                Budget
              </Link>
              <Link 
                to="/files" 
                className={`hover:text-blue-200 ${isActive('/files') ? 'border-b-2' : ''}`}
              >
                Files
              </Link>
              
              {/* VULNERABILITY: Show admin link for all users (broken frontend access control) */}
              <Link 
                to="/admin" 
                className={`hover:text-blue-200 ${location.pathname.startsWith('/admin') ? 'border-b-2' : ''}`}
              >
                Admin
              </Link>
              
              <div className="flex items-center space-x-4">
                <Link 
                  to="/profile" 
                  className="hover:text-blue-200"
                >
                  {/* VULNERABILITY: Display user role in frontend */}
                  👤 {user.displayName || user.username} ({user.role})
                </Link>
                <button 
                  onClick={onLogout}
                  className="bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded"
                >
                  Logout
                </button>
              </div>
            </div>
          ) : (
            <div className="flex space-x-4">
              <Link to="/login" className="hover:text-blue-200">
                Login
              </Link>
              <Link to="/register" className="hover:text-blue-200">
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar; 