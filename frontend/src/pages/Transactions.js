import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Transactions({ user }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const response = await axios.get('/transactions');
      setTransactions(response.data.transactions);
    } catch (error) {
      console.error('Failed to load transactions:', error);
      setError('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // VULNERABILITY: Send search parameters directly (SQLi vulnerability)
      const params = new URLSearchParams();
      if (searchQuery) params.append('query', searchQuery);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      const response = await axios.get(`/transactions/search?${params.toString()}`);
      setTransactions(response.data.transactions);
    } catch (error) {
      console.error('Search failed:', error);
      
      // VULNERABILITY: Display SQL errors to user
      if (error.response?.data?.sqlError) {
        setError(`Database Error: ${error.response.data.sqlError}`);
      } else if (error.response?.data?.query) {
        setError(`Query: ${error.response.data.query}`);
      } else {
        setError(error.response?.data?.error || 'Search failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const viewTransaction = async (transactionId) => {
    try {
      // VULNERABILITY: IDOR - access any transaction by ID
      const response = await axios.get(`/transactions/${transactionId}`);
      
      // VULNERABILITY: Display transaction details in alert (could contain XSS)
      alert(`Transaction Details:\n${JSON.stringify(response.data.transaction, null, 2)}`);
    } catch (error) {
      console.error('Failed to load transaction details:', error);
      alert('Failed to load transaction details');
    }
  };

  if (loading && transactions.length === 0) {
    return <div className="text-center">Loading transactions...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-6">Transaction History</h2>
        
        {/* Search Form */}
        <form onSubmit={handleSearch} className="mb-6 space-y-4 md:space-y-0 md:flex md:space-x-4">
          <div className="flex-1">
            <label htmlFor="searchQuery" className="block text-sm font-medium text-gray-700">
              Search Description
            </label>
            <input
              type="text"
              id="searchQuery"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="vulnerable-input w-full mt-1"
              placeholder="Search transactions... (SQL injection friendly)"
            />
          </div>
          
          <div>
            <label htmlFor="dateFrom" className="block text-sm font-medium text-gray-700">
              From Date
            </label>
            <input
              type="date"
              id="dateFrom"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="vulnerable-input mt-1"
            />
          </div>
          
          <div>
            <label htmlFor="dateTo" className="block text-sm font-medium text-gray-700">
              To Date
            </label>
            <input
              type="date"
              id="dateTo"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="vulnerable-input mt-1"
            />
          </div>
          
          <div className="flex items-end">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        {error && (
          <div className="alert-error mb-4">
            {/* VULNERABILITY: Render error messages without sanitization */}
            <div dangerouslySetInnerHTML={{ __html: error }} />
          </div>
        )}

        {/* Transactions Table */}
        {transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left">ID</th>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Description</th>
                  <th className="px-4 py-2 text-left">From/To</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                  <th className="px-4 py-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-sm">{transaction.id}</td>
                    <td className="px-4 py-2">
                      {new Date(transaction.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2">
                      {/* VULNERABILITY: Render description without sanitization */}
                      <span dangerouslySetInnerHTML={{ __html: transaction.description }} />
                    </td>
                    <td className="px-4 py-2">
                      {transaction.fromUserId === user.id ? (
                        <span className="text-red-600">
                          To: {transaction.toDisplayName || transaction.toUsername || 'N/A'}
                        </span>
                      ) : (
                        <span className="text-green-600">
                          From: {transaction.fromDisplayName || transaction.fromUsername || 'N/A'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <span className={transaction.fromUserId === user.id ? 'text-red-600' : 'text-green-600'}>
                        {transaction.fromUserId === user.id ? '-' : '+'}${transaction.amount.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        onClick={() => viewTransaction(transaction.id)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No transactions found.</p>
        )}
      </div>

      {/* SQL Injection Testing Help */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-medium text-yellow-800 mb-2">SQL Injection Testing Examples</h4>
        <div className="text-sm text-yellow-700 space-y-1">
          <p><strong>Time-based SQLi:</strong> <code>' OR SLEEP(5)--</code></p>
          <p><strong>Error-based SQLi:</strong> <code>' AND (SELECT * FROM users)--</code></p>
          <p><strong>Union-based SQLi:</strong> <code>' UNION SELECT 1,2,3,4,5--</code></p>
        </div>
      </div>

      {/* Transaction ID Testing */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 mb-2">IDOR Testing</h4>
        <p className="text-sm text-blue-700 mb-2">
          Try accessing different transaction IDs to test for Insecure Direct Object References:
        </p>
        <div className="flex space-x-2">
          {[1, 2, 3, 4, 5, 10, 15, 20].map(id => (
            <button
              key={id}
              onClick={() => viewTransaction(id)}
              className="text-sm bg-blue-200 hover:bg-blue-300 px-2 py-1 rounded"
            >
              ID: {id}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Transactions; 