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