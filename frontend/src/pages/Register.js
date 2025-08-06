import React, { useState } from 'react';
import axios from 'axios';

function Register({ onLogin }) {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    displayName: '',
    email: ''
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
      const response = await axios.post('/auth/register', formData);
      
      // VULNERABILITY: Log sensitive registration data
      console.log('Registration successful:', response.data);
      
      // VULNERABILITY: Store token in localStorage
      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('sessionId', response.data.sessionId);
      
      onLogin(response.data.user);
    } catch (error) {
      console.error('Registration error:', error.response?.data);
      
      // VULNERABILITY: Display detailed error messages including SQL errors
      if (error.response?.data?.details) {
        setError(`Error: ${error.response.data.error} - ${error.response.data.details}`);
      } else {
        setError(error.response?.data?.error || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-center mb-6">Create BuggyBank Account</h2>
      
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
            autoComplete="new-password"
          />
        </div>

        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
            Display Name
          </label>
          <input
            type="text"
            id="displayName"
            name="displayName"
            value={formData.displayName}
            onChange={handleChange}
            className="vulnerable-input w-full mt-1"
            placeholder="How should we display your name?"
          />
          <p className="text-xs text-gray-500 mt-1">
            You can use HTML formatting in your display name for rich text.
          </p>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="vulnerable-input w-full mt-1"
            autoComplete="email"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full"
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Already have an account?{' '}
          <a href="/login" className="text-blue-600 hover:underline">
            Sign in here
          </a>
        </p>
      </div>
    </div>
  );
}

export default Register; 