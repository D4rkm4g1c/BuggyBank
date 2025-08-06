const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const authMiddleware = require('../middleware/auth');

// VULNERABILITY: Missing authentication on some endpoints
router.get('/', authMiddleware.authenticate, transactionController.getTransactions);
router.get('/:id', transactionController.getTransaction); // No auth - IDOR vulnerability
router.post('/transfer', authMiddleware.authenticate, transactionController.transfer);
router.get('/search', authMiddleware.authenticate, transactionController.searchTransactions);

module.exports = router;
```

```js:backend/routes/budgets.js
const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budgetController');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware.authenticate, budgetController.getBudgets);
router.post('/', authMiddleware.authenticate, budgetController.createBudget);
router.put('/:id', authMiddleware.authenticate, budgetController.updateBudget);
router.delete('/:id', budgetController.deleteBudget); // VULNERABILITY: No authentication

module.exports = router;
```

```js:backend/controllers/budgetController.js
const sqlite3 = require('sqlite3').verbose();
const Logger = require('../utils/logger');

const DB_PATH = './buggybank.db';

const budgetController = {
  getBudgets: (req, res) => {
    const userId = req.user.userId;
    
    const db = new sqlite3.Database(DB_PATH);
    
    // VULNERABILITY: Second-order SQL injection via stored labels
    const query = `
      SELECT * FROM budgets 
      WHERE userId = ? 
      ORDER BY created_at DESC
    `;
    
    db.all(query, [userId], (err, budgets) => {
      if (err) {
        Logger.error('Budget query failed', { userId, error: err.message });
        return res.status(500).json({ error: 'Database error' });
      }
      
      res.json({ budgets });
      db.close();
    });
  },

  createBudget: (req, res) => {
    const { category, label, allocatedAmount } = req.body;
    const userId = req.user.userId;
    
    if (!category || !allocatedAmount || allocatedAmount <= 0) {
      return res.status(400).json({ error: 'Category and valid amount required' });
    }
    
    const db = new sqlite3.Database(DB_PATH);
    
    // VULNERABILITY: Store user input without sanitization (enables stored XSS and second-order SQLi)
    const query = `
      INSERT INTO budgets (userId, category, label, allocatedAmount) 
      VALUES (?, ?, ?, ?)
    `;
    
    db.run(query, [userId, category, label, allocatedAmount], function(err) {
      if (err) {
        Logger.error('Budget creation failed', { userId, category, label, error: err.message });
        
        return res.status(500).json({ 
          error: 'Budget creation failed',
          sqlError: err.message // VULNERABILITY: Expose SQL errors
        });
      }
      
      Logger.info('Budget created', { 
        budgetId: this.lastID, 
        userId, 
        category, 
        label,
        allocatedAmount 
      });
      
      res.status(201).json({
        message: 'Budget created successfully',
        budget: {
          id: this.lastID,
          userId,
          category,
          label,
          allocatedAmount,
          spentAmount: 0
        }
      });
      
      db.close();
    });
  },

  updateBudget: (req, res) => {
    const { id } = req.params;
    const { category, label, allocatedAmount, spentAmount } = req.body;
    const userId = req.user.userId;
    
    const db = new sqlite3.Database(DB_PATH);
    
    // VULNERABILITY: IDOR - only check ownership after update attempt
    let updateQuery = 'UPDATE budgets SET ';
    const updates = [];
    const params = [];
    
    if (category) {
      updates.push('category = ?');
      params.push(category);
    }
    
    if (label !== undefined) {
      // VULNERABILITY: Direct string concatenation for XSS/SQLi
      updates.push(`label = '${label}'`);
    }
    
    if (allocatedAmount !== undefined) {
      updates.push('allocatedAmount = ?');
      params.push(allocatedAmount);
    }
    
    if (spentAmount !== undefined) {
      updates.push('spentAmount = ?');
      params.push(spentAmount);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'At least one field must be provided' });
    }
    
    updateQuery += updates.join(', ') + ' WHERE id = ? AND userId = ?';
    params.push(id, userId);
    
    Logger.info('Budget update attempt', { budgetId: id, userId, updateQuery });
    
    db.run(updateQuery, params, function(err) {
      if (err) {
        Logger.error('Budget update failed', { budgetId: id, userId, error: err.message });
        
        return res.status(500).json({ 
          error: 'Update failed',
          sqlError: err.message, // VULNERABILITY: Expose SQL errors
          query: updateQuery
        });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Budget not found or access denied' });
      }
      
      Logger.info('Budget updated successfully', { budgetId: id, userId });
      res.json({ message: 'Budget updated successfully' });
      
      db.close();
    });
  },

  // VULNERABILITY: No authentication - anyone can delete any budget
  deleteBudget: (req, res) => {
    const { id } = req.params;
    
    const db = new sqlite3.Database(DB_PATH);
    
    Logger.info('Budget deletion attempt', { budgetId: id });
    
    db.run('DELETE FROM budgets WHERE id = ?', [id], function(err) {
      if (err) {
        Logger.error('Budget deletion failed', { budgetId: id, error: err.message });
        return res.status(500).json({ error: 'Deletion failed' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Budget not found' });
      }
      
      Logger.info('Budget deleted without authentication', { budgetId: id });
      res.json({ message: 'Budget deleted successfully' });
      
      db.close();
    });
  }
};

module.exports = budgetController;
```

Now let me create the complete React frontend with all specified vulnerabilities:

## Frontend Configuration

```js:frontend/src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
```

```css:frontend/src/index.css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom styles for BuggyBank */
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* VULNERABILITY: Disable security features */
* {
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
  user-select: text;
}

/* Custom components */
.vulnerable-input {
  @apply border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500;
}

.btn-primary {
  @apply bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded;
}

.btn-secondary {
  @apply bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded;
}

.btn-danger {
  @apply bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded;
}

.card {
  @apply bg-white shadow-md rounded-lg p-6;
}

.alert-error {
  @apply bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded;
}

.alert-success {
  @apply bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded;
}

/* VULNERABILITY: CSS that could be exploited */
input[type="password"] {
  font-family: monospace; /* Potential font-based attacks */
}
```

```json:frontend/tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'buggy-primary': '#1e40af',
        'buggy-secondary': '#64748b',
        'buggy-danger': '#dc2626',
        'buggy-success': '#16a34a',
      }
    },
  },
  plugins: [],
}
```

```json:frontend/postcss.config.js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

## Main App Component with Routing

```jsx:frontend/src/App.js
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
```

## Navigation Component

```jsx:frontend/src/components/Navbar.js
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
```

## Login Page with SQL Injection

```jsx:frontend/src/pages/Login.js
import React, { useState } from 'react';
import axios from 'axios';

function Login({ onLogin }) {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/auth/login', formData);
      
      // VULNERABILITY: Log sensitive authentication data
      console.log('Login successful:', {
        user: response.data.user,
        token: response.data.token,
        sessionId: response.data.sessionId
      });
      
      // VULNERABILITY: Store token in localStorage
      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('sessionId', response.data.sessionId);
      
      onLogin(response.data.user);
    } catch (error) {
      console.error('Login error:', error.response?.data);
      
      // VULNERABILITY: Display detailed error messages including SQL errors
      if (error.response?.data?.sqlError) {
        setError(`Database Error: ${error.response.data.sqlError}`);
      } else if (error.response?.data?.query) {
        setError(`Query Failed: ${error.response.data.query}`);
      } else {
        setError(error.response?.data?.error || 'Login failed');
      }
      
      // VULNERABILITY: Expose error details in console
      window.lastLoginError = error.response?.data;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-center mb-6">Login to BuggyBank</h2>
      
      {error && (
        <div className="alert-error mb-4">
          {/* VULNERABILITY: Render error messages without sanitization */}
          <div dangerouslySetInnerHTML={{ __html: error }} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700">
            Username
          </label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            className="vulnerable-input w-full mt-1"
            required
            autoComplete="username"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="vulnerable-input w-full mt-1"
            required
            autoComplete="current-password"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full"
        >
          {loading ? 'Signing In...' : 'Sign In'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Don't have an account?{' '}
          <a href="/register" className="text-blue-600 hover:underline">
            Sign up here
          </a>
        </p>
      </div>

      {/* VULNERABILITY: Helpful hints for SQL injection testing */}
      <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-gray-600">
        <p><strong>Test Accounts:</strong></p>
        <p>Admin: admin / admin123</p>
        <p>User: alice / password123</p>
        <p className="mt-2 text-red-600">
          <strong>Security Notice:</strong> This application contains deliberate vulnerabilities for training purposes.
        </p>
      </div>
    </div>
  );
}

export default Login;
```

## Dashboard with Multiple Vulnerabilities

```jsx:frontend/src/pages/Dashboard.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Dashboard({ user }) {
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [transactionsRes, budgetsRes] = await Promise.all([
        axios.get('/transactions'),
        axios.get('/budgets')
      ]);
      
      setTransactions(transactionsRes.data.transactions.slice(0, 5)); // Show recent 5
      setBudgets(budgetsRes.data.budgets);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = async (e) => {
    const filterValue = e.target.value;
    setFilter(filterValue);

    // VULNERABILITY: Send filter directly to backend (time-based SQLi)
    if (filterValue) {
      try {
        const response = await axios.get(`/transactions?filter=${filterValue}`);
        setTransactions(response.data.transactions.slice(0, 5));
      } catch (error) {
        console.error('Filter failed:', error);
        
        // VULNERABILITY: Display SQL errors to user
        if (error.response?.data?.sqlError) {
          alert(`Database Error: ${error.response.data.sqlError}`);
        }
      }
    } else {
      loadDashboardData();
    }
  };

  if (loading) {
    return <div className="text-center">Loading dashboard...</div>;
  }

  const totalBudget = budgets.reduce((sum, budget) => sum + budget.allocatedAmount, 0);
  const totalSpent = budgets.reduce((sum, budget) => sum + budget.spentAmount, 0);

  return (
    <div className="space-y-6">
      {/* Welcome Section with XSS vulnerability */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-4">
          {/* VULNERABILITY: Render displayName without sanitization (stored XSS) */}
          Welcome back, <span dangerouslySetInnerHTML={{ __html: user.displayName || user.username }} />!
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded">
            <h3 className="font-semibold text-blue-800">Account Balance</h3>
            <p className="text-2xl font-bold text-blue-600">${user.balance?.toFixed(2)}</p>
          </div>
          
          <div className="bg-green-50 p-4 rounded">
            <h3 className="font-semibold text-green-800">Total Budget</h3>
            <p className="text-2xl font-bold text-green-600">${totalBudget.toFixed(2)}</p>
          </div>
          
          <div className="bg-orange-50 p-4 rounded">
            <h3 className="font-semibold text-orange-800">Total Spent</h3>
            <p className="text-2xl font-bold text-orange-600">${totalSpent.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Recent Transactions with SQL Injection Filter */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Recent Transactions</h2>
          <div>
            <input
              type="text"
              placeholder="Filter transactions..."
              value={filter}
              onChange={handleFilterChange}
              className="vulnerable-input"
            />
          </div>
        </div>
        
        {transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Description</th>
                  <th className="px-4 py-2 text-left">From/To</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-t">
                    <td className="px-4 py-2">
                      {new Date(transaction.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2">
                      {/* VULNERABILITY: Render description without sanitization */}
                      <span dangerouslySetInnerHTML={{ __html: transaction.description }} />
                    </td>
                    <td className="px-4 py-2">
                      {transaction.fromUserId === user.id 
                        ? `To: ${transaction.toUsername || 'N/A'}`
                        : `From: ${transaction.fromUsername || 'N/A'}`
                      }
                    </td>
                    <td className="px-4 py-2 text-right">
                      <span className={transaction.fromUserId === user.id ? 'text-red-600' : 'text-green-600'}>
                        {transaction.fromUserId === user.id ? '-' : '+'}${transaction.amount.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">No transactions found.</p>
        )}
      </div>

      {/* Budget Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Budget Overview</h2>
        
        {budgets.length > 0 ? (
          <div className="space-y-3">
            {budgets.map((budget) => {
              const percentage = (budget.spentAmount / budget.allocatedAmount) * 100;
              return (
                <div key={budget.id} className="border rounded p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">{budget.category}</span>
                    <span className="text-sm text-gray-600">
                      ${budget.spentAmount.toFixed(2)} / ${budget.allocatedAmount.toFixed(2)}
                    </span>
                  </div>
                  
                  {/* VULNERABILITY: Render budget label without sanitization (stored XSS) */}
                  {budget.label && (
                    <div className="text-sm text-gray-600 mb-2">
                      <span dangerouslySetInnerHTML={{ __html: budget.label }} />
                    </div>
                  )}
                  
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${percentage > 100 ? 'bg-red-500' : percentage > 80 ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500">No budgets created yet.</p>
        )}
      </div>

      {/* VULNERABILITY: Debug information exposure */}
      <div className="bg-gray-100 rounded-lg p-4 text-xs">
        <details>
          <summary className="cursor-pointer font-medium">Debug Information (Click to expand)</summary>
          <pre className="mt-2 overflow-auto">
            {JSON.stringify({
              user: user,
              localStorage: { ...localStorage },
              sessionStorage: { ...sessionStorage },
              cookies: document.cookie,
              userAgent: navigator.userAgent,
              timestamp: new Date().toISOString()
            }, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}

export default Dashboard;
```

Let me continue with the remaining frontend components. This is building into a comprehensive vulnerable banking application with all the specified security flaws embedded naturally in the workflow. 