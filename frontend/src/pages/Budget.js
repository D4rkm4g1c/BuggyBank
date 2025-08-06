import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Budget({ user }) {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    category: '',
    label: '',
    allocatedAmount: ''
  });
  const [editingBudget, setEditingBudget] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadBudgets();
  }, []);

  const loadBudgets = async () => {
    try {
      const response = await axios.get('/budgets');
      setBudgets(response.data.budgets);
    } catch (error) {
      console.error('Failed to load budgets:', error);
      setError('Failed to load budgets');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      if (editingBudget) {
        await axios.put(`/budgets/${editingBudget.id}`, {
          ...formData,
          allocatedAmount: parseFloat(formData.allocatedAmount)
        });
        setMessage('Budget updated successfully!');
      } else {
        await axios.post('/budgets', {
          ...formData,
          allocatedAmount: parseFloat(formData.allocatedAmount)
        });
        setMessage('Budget created successfully!');
      }
      
      setFormData({ category: '', label: '', allocatedAmount: '' });
      setEditingBudget(null);
      loadBudgets();
    } catch (error) {
      console.error('Budget operation failed:', error);
      
      // VULNERABILITY: Display SQL errors
      if (error.response?.data?.sqlError) {
        setError(`Database Error: ${error.response.data.sqlError}`);
      } else {
        setError(error.response?.data?.error || 'Operation failed');
      }
    }
  };

  const editBudget = (budget) => {
    setFormData({
      category: budget.category,
      label: budget.label || '',
      allocatedAmount: budget.allocatedAmount.toString()
    });
    setEditingBudget(budget);
  };

  const deleteBudget = async (budgetId) => {
    if (!confirm('Are you sure you want to delete this budget?')) return;

    try {
      // VULNERABILITY: No authentication required for delete
      await axios.delete(`/budgets/${budgetId}`);
      setMessage('Budget deleted successfully!');
      loadBudgets();
    } catch (error) {
      console.error('Delete failed:', error);
      setError('Failed to delete budget');
    }
  };

  const cancelEdit = () => {
    setFormData({ category: '', label: '', allocatedAmount: '' });
    setEditingBudget(null);
  };

  if (loading) {
    return <div className="text-center">Loading budgets...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Budget Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-6">
          {editingBudget ? 'Edit Budget' : 'Create New Budget'}
        </h2>
        
        {message && (
          <div className="alert-success mb-4">{message}</div>
        )}
        
        {error && (
          <div className="alert-error mb-4">
            {/* VULNERABILITY: Render error without sanitization */}
            <div dangerouslySetInnerHTML={{ __html: error }} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">
              Category
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="vulnerable-input w-full mt-1"
              required
            >
              <option value="">Select a category</option>
              <option value="Food">Food & Dining</option>
              <option value="Transportation">Transportation</option>
              <option value="Entertainment">Entertainment</option>
              <option value="Shopping">Shopping</option>
              <option value="Utilities">Utilities</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="label" className="block text-sm font-medium text-gray-700">
              Label/Description
            </label>
            <input
              type="text"
              id="label"
              name="label"
              value={formData.label}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              className="vulnerable-input w-full mt-1"
              placeholder="HTML formatting supported (e.g., <b>Bold</b>, <script>alert('XSS')</script>)"
            />
            <p className="text-xs text-gray-500 mt-1">
              Preview: <span dangerouslySetInnerHTML={{ __html: formData.label }} />
            </p>
          </div>

          <div>
            <label htmlFor="allocatedAmount" className="block text-sm font-medium text-gray-700">
              Allocated Amount ($)
            </label>
            <input
              type="number"
              id="allocatedAmount"
              name="allocatedAmount"
              value={formData.allocatedAmount}
              onChange={(e) => setFormData({ ...formData, allocatedAmount: e.target.value })}
              className="vulnerable-input w-full mt-1"
              required
              min="0"
              step="0.01"
              placeholder="0.00"
            />
          </div>

          <div className="flex space-x-2">
            <button type="submit" className="btn-primary">
              {editingBudget ? 'Update Budget' : 'Create Budget'}
            </button>
            
            {editingBudget && (
              <button type="button" onClick={cancelEdit} className="btn-secondary">
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Budget List */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold mb-4">Your Budgets</h3>
        
        {budgets.length > 0 ? (
          <div className="space-y-4">
            {budgets.map((budget) => {
              const percentage = budget.allocatedAmount > 0 
                ? (budget.spentAmount / budget.allocatedAmount) * 100 
                : 0;
              
              return (
                <div key={budget.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg">{budget.category}</h4>
                      
                      {/* VULNERABILITY: Render label without sanitization (stored XSS) */}
                      {budget.label && (
                        <div 
                          className="text-sm text-gray-600 mt-1"
                          dangerouslySetInnerHTML={{ __html: budget.label }}
                        />
                      )}
                      
                      <div className="text-sm text-gray-500 mt-2">
                        <span className="font-medium">
                          ${budget.spentAmount.toFixed(2)} / ${budget.allocatedAmount.toFixed(2)}
                        </span>
                        <span className="ml-2">
                          ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => editBudget(budget)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteBudget(budget.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all duration-300 ${
                        percentage > 100 ? 'bg-red-500' : 
                        percentage > 80 ? 'bg-yellow-500' : 
                        'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    ></div>
                  </div>
                  
                  {percentage > 100 && (
                    <p className="text-red-600 text-xs mt-1">
                      ⚠️ Over budget by ${(budget.spentAmount - budget.allocatedAmount).toFixed(2)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No budgets created yet.</p>
            <p className="text-sm mt-1">Create your first budget to start tracking your spending!</p>
          </div>
        )}
      </div>

      {/* Budget Testing Tools */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h4 className="font-medium text-purple-800 mb-2">XSS Testing in Budget Labels</h4>
        <div className="text-sm text-purple-700 space-y-1">
          <p><strong>Stored XSS:</strong> <code>&lt;script&gt;alert('Budget XSS')&lt;/script&gt;</code></p>
          <p><strong>Image XSS:</strong> <code>&lt;img src=x onerror=alert('XSS')&gt;</code></p>
          <p><strong>SVG XSS:</strong> <code>&lt;svg onload=alert('XSS')&gt;&lt;/svg&gt;</code></p>
        </div>
      </div>
    </div>
  );
}

export default Budget; 