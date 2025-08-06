import React, { useState } from 'react';
import axios from 'axios';

function Transfer({ user }) {
  const [formData, setFormData] = useState({
    toUsername: '',
    amount: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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
    setMessage('');

    // VULNERABILITY: No CSRF protection - form can be submitted from external sites
    try {
      const response = await axios.post('/transactions/transfer', {
        toUsername: formData.toUsername,
        amount: parseFloat(formData.amount),
        description: formData.description
      });

      setMessage(`Transfer successful! Sent $${formData.amount} to ${formData.toUsername}`);
      setFormData({ toUsername: '', amount: '', description: '' });
      
      // VULNERABILITY: Log transaction details
      console.log('Transfer completed:', response.data);
      
    } catch (error) {
      console.error('Transfer failed:', error);
      setError(error.response?.data?.error || 'Transfer failed');
    } finally {
      setLoading(false);
    }
  };

  // VULNERABILITY: Auto-fill transfer form from URL parameters (CSRF attack vector)
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const autoFillData = {
      toUsername: urlParams.get('to') || '',
      amount: urlParams.get('amount') || '',
      description: urlParams.get('desc') || ''
    };
    
    if (autoFillData.toUsername || autoFillData.amount) {
      setFormData(autoFillData);
      
      // VULNERABILITY: Auto-submit if all parameters are provided
      if (autoFillData.toUsername && autoFillData.amount && urlParams.get('autosubmit') === 'true') {
        setTimeout(() => {
          document.getElementById('transfer-form').dispatchEvent(new Event('submit', { bubbles: true }));
        }, 1000);
      }
    }
  }, []);

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-center mb-6">Transfer Funds</h2>
      
      <div className="mb-4 p-3 bg-blue-50 rounded">
        <p className="text-sm text-blue-800">
          <strong>Your Balance:</strong> ${user.balance?.toFixed(2)}
        </p>
      </div>

      {message && (
        <div className="alert-success mb-4">{message}</div>
      )}
      
      {error && (
        <div className="alert-error mb-4">{error}</div>
      )}

      <form id="transfer-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="toUsername" className="block text-sm font-medium text-gray-700">
            Recipient Username
          </label>
          <input
            type="text"
            id="toUsername"
            name="toUsername"
            value={formData.toUsername}
            onChange={handleChange}
            className="vulnerable-input w-full mt-1"
            required
            placeholder="Enter recipient's username"
          />
        </div>

        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
            Amount ($)
          </label>
          <input
            type="number"
            id="amount"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            className="vulnerable-input w-full mt-1"
            required
            min="0.01"
            step="0.01"
            placeholder="0.00"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description (Optional)
          </label>
          <input
            type="text"
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="vulnerable-input w-full mt-1"
            placeholder="What's this transfer for?"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !formData.toUsername || !formData.amount}
          className="btn-primary w-full"
        >
          {loading ? 'Processing Transfer...' : 'Send Money'}
        </button>
      </form>

      {/* VULNERABILITY: Quick transfer buttons (CSRF demo) */}
      <div className="mt-6 p-4 bg-gray-50 rounded">
        <h4 className="font-medium text-gray-700 mb-2">Quick Transfers</h4>
        <div className="space-y-2">
          <button
            onClick={() => setFormData({ toUsername: 'admin', amount: '10', description: 'Quick payment' })}
            className="text-sm bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded w-full text-left"
          >
            → Send $10 to admin
          </button>
          <button
            onClick={() => setFormData({ toUsername: 'alice', amount: '25', description: 'Quick payment' })}
            className="text-sm bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded w-full text-left"
          >
            → Send $25 to alice
          </button>
        </div>
      </div>

      {/* VULNERABILITY: CSRF attack demonstration */}
      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-xs">
        <p className="text-red-700">
          <strong>CSRF Demo:</strong> This form can be submitted from external sites.
        </p>
        <p className="text-red-600 mt-1">
          Try: <code>?to=hacker&amount=100&desc=stolen&autosubmit=true</code>
        </p>
      </div>
    </div>
  );
}

export default Transfer; 