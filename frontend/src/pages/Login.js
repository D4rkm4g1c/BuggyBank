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