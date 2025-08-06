import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import axios from 'axios';

function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [systemInfo, setSystemInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      // VULNERABILITY: No role checking on frontend - any authenticated user can access
      const [usersRes, transactionsRes, systemRes] = await Promise.all([
        axios.get('/admin/users'),
        axios.get('/admin/transactions'),
        axios.get('/admin/system-info')
      ]);

      setUsers(usersRes.data.users);
      setTransactions(transactionsRes.data.transactions.slice(0, 10));
      setSystemInfo(systemRes.data.systemInfo);
    } catch (error) {
      console.error('Failed to load admin data:', error);
      setMessage('Failed to load admin data - but no role verification performed!');
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      await axios.put(`/admin/users/${userId}/role`, { role: newRole });
      setMessage(`User role updated to ${newRole}`);
      loadAdminData();
    } catch (error) {
      console.error('Role update failed:', error);
      setMessage('Role update failed');
    }
  };

  const sendBroadcast = async (e) => {
    e.preventDefault();
    
    if (!broadcastMessage.trim()) return;

    try {
      await axios.post('/admin/broadcast', {
        message: broadcastMessage,
        type: 'admin'
      });
      
      setMessage('Broadcast message sent!');
      setBroadcastMessage('');
    } catch (error) {
      console.error('Broadcast failed:', error);
      setMessage('Broadcast failed');
    }
  };

  if (loading) {
    return <div className="text-center">Loading admin panel...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Admin Warning */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h2 className="text-xl font-bold text-red-800 mb-2">⚠️ Admin Panel</h2>
        <p className="text-red-700 text-sm">
          This admin panel has broken access control - any authenticated user can access it!
        </p>
      </div>

      {message && (
        <div className="alert-success">{message}</div>
      )}

      {/* System Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">System Information</h3>
        
        {systemInfo && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <strong>Platform:</strong> {systemInfo.platform}
            </div>
            <div>
              <strong>Architecture:</strong> {systemInfo.architecture}
            </div>
            <div>
              <strong>CPUs:</strong> {systemInfo.cpus}
            </div>
            <div>
              <strong>Memory:</strong> {(systemInfo.totalMemory / 1024 / 1024 / 1024).toFixed(2)} GB
            </div>
            <div>
              <strong>Hostname:</strong> {systemInfo.hostname}
            </div>
            <div>
              <strong>Node Version:</strong> {systemInfo.nodeVersion}
            </div>
          </div>
        )}

        {/* VULNERABILITY: Expose environment variables */}
        <details className="mt-4">
          <summary className="cursor-pointer font-medium text-red-600">
            🚨 Environment Variables (Click to expand)
          </summary>
          <pre className="mt-2 text-xs overflow-auto bg-gray-100 p-2 rounded">
            {systemInfo && JSON.stringify(systemInfo.environment, null, 2)}
          </pre>
        </details>
      </div>

      {/* User Management */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">User Management</h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left">ID</th>
                <th className="px-4 py-2 text-left">Username</th>
                <th className="px-4 py-2 text-left">Display Name</th>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">Role</th>
                <th className="px-4 py-2 text-left">Balance</th>
                <th className="px-4 py-2 text-left">Password</th>
                <th className="px-4 py-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t">
                  <td className="px-4 py-2 font-mono text-sm">{user.id}</td>
                  <td className="px-4 py-2">{user.username}</td>
                  <td className="px-4 py-2">
                    {/* VULNERABILITY: Render display name without sanitization */}
                    <span dangerouslySetInnerHTML={{ __html: user.displayName }} />
                  </td>
                  <td className="px-4 py-2">{user.email}</td>
                  <td className="px-4 py-2">
                    <select
                      value={user.role}
                      onChange={(e) => updateUserRole(user.id, e.target.value)}
                      className="text-sm border rounded px-2 py-1"
                    >
                      <option value="user">User</option>
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-2">${user.balance?.toFixed(2)}</td>
                  {/* VULNERABILITY: Expose plaintext passwords */}
                  <td className="px-4 py-2 font-mono text-xs">
                    <code className="bg-red-100 px-1 py-0.5 rounded">
                      {user.password}
                    </code>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <Link
                      to={`/admin/users/${user.id}`}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left">ID</th>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">From</th>
                <th className="px-4 py-2 text-left">To</th>
                <th className="px-4 py-2 text-left">Amount</th>
                <th className="px-4 py-2 text-left">Description</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="border-t">
                  <td className="px-4 py-2 font-mono text-sm">{transaction.id}</td>
                  <td className="px-4 py-2 text-sm">
                    {new Date(transaction.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {transaction.fromUsername || 'N/A'}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {transaction.toUsername || 'N/A'}
                  </td>
                  <td className="px-4 py-2 font-semibold">
                    ${transaction.amount.toFixed(2)}
                  </td>
                  <td className="px-4 py-2">
                    {/* VULNERABILITY: Render description without sanitization */}
                    <span dangerouslySetInnerHTML={{ __html: transaction.description }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Broadcast Message */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Broadcast System Message</h3>
        <p className="text-sm text-gray-600 mb-4">
          Send messages that will appear to all users. HTML content is supported for rich formatting.
        </p>
        
        <form onSubmit={sendBroadcast} className="space-y-4">
          <div>
            <label htmlFor="broadcastMessage" className="block text-sm font-medium text-gray-700">
              Message Content
            </label>
            <textarea
              id="broadcastMessage"
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              className="vulnerable-input w-full mt-1"
              rows="3"
              placeholder="Type your message... HTML tags like <script>, <img>, etc. are allowed"
            />
          </div>
          
          <button type="submit" className="btn-primary">
            Send Broadcast Message
          </button>
        </form>
      </div>
    </div>
  );
}

function UserDetails({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserDetails();
  }, [userId]);

  const loadUserDetails = async () => {
    try {
      // VULNERABILITY: No authentication required for this endpoint
      const response = await axios.get(`/admin/users/${userId}`);
      setUser(response.data.user);
    } catch (error) {
      console.error('Failed to load user details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center">Loading user details...</div>;
  }

  if (!user) {
    return <div className="text-center text-red-600">User not found</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">User Details: {user.username}</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="font-medium">Username:</label>
            <p>{user.username}</p>
          </div>
          
          <div>
            <label className="font-medium">Display Name:</label>
            {/* VULNERABILITY: Render without sanitization */}
            <div dangerouslySetInnerHTML={{ __html: user.displayName }} />
          </div>
          
          <div>
            <label className="font-medium">Email:</label>
            <p>{user.email}</p>
          </div>
          
          <div>
            <label className="font-medium">Role:</label>
            <p>{user.role}</p>
          </div>
          
          <div>
            <label className="font-medium">Balance:</label>
            <p>${user.balance?.toFixed(2)}</p>
          </div>
          
          {/* VULNERABILITY: Expose sensitive data */}
          <div>
            <label className="font-medium text-red-600">Password (Plaintext):</label>
            <p className="font-mono bg-red-100 p-2 rounded">{user.password}</p>
          </div>
          
          <div>
            <label className="font-medium text-red-600">Session ID:</label>
            <p className="font-mono bg-red-100 p-2 rounded text-xs break-all">{user.sessionId}</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="font-medium">Comments:</label>
            <div className="space-y-2 mt-2">
              {user.comments && user.comments.length > 0 ? (
                user.comments.map((comment, index) => (
                  <div key={index} className="border-l-4 border-blue-500 pl-3">
                    {/* VULNERABILITY: Render comments without sanitization */}
                    <div dangerouslySetInnerHTML={{ __html: comment }} />
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No comments</p>
              )}
            </div>
          </div>
          
          <div>
            <label className="font-medium">Uploaded Files:</label>
            <div className="mt-2">
              {user.uploadedFiles && user.uploadedFiles.length > 0 ? (
                <ul className="space-y-1">
                  {user.uploadedFiles.map((file, index) => (
                    <li key={index} className="text-sm">
                      <a 
                        href={`/uploads/${file}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {file}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">No files uploaded</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CommentsReview() {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadComments();
  }, []);

  const loadComments = async () => {
    try {
      // VULNERABILITY: No authentication required
      const response = await axios.get('/admin/comments');
      setComments(response.data.comments);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const reviewComment = async (commentId, isReviewed) => {
    try {
      await axios.put(`/admin/comments/${commentId}/review`, { isReviewed });
      loadComments();
    } catch (error) {
      console.error('Review failed:', error);
    }
  };

  if (loading) {
    return <div className="text-center">Loading comments...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">Comments for Review</h2>
      <p className="text-sm text-orange-600 mb-4">
        ⚠️ This page renders user comments without sanitization - perfect for XSS testing!
      </p>
      
      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="border rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="font-medium">{comment.displayName || comment.username}</span>
                <span className="text-gray-500 ml-2">({comment.role})</span>
                <span className="text-xs text-gray-400 ml-2">
                  {new Date(comment.created_at).toLocaleString()}
                </span>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => reviewComment(comment.id, !comment.isReviewed)}
                  className={`text-sm px-3 py-1 rounded ${
                    comment.isReviewed 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {comment.isReviewed ? 'Reviewed' : 'Mark Reviewed'}
                </button>
              </div>
            </div>
            
            {/* VULNERABILITY: Render comment content without sanitization (XSS) */}
            <div 
              className="text-gray-700 p-3 bg-gray-50 rounded"
              dangerouslySetInnerHTML={{ __html: comment.content }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function Admin({ user }) {
  const location = useLocation();

  return (
    <div className="space-y-6">
      {/* Admin Navigation */}
      <div className="bg-white rounded-lg shadow p-4">
        <nav className="flex space-x-6">
          <Link 
            to="/admin" 
            className={`hover:text-blue-600 ${location.pathname === '/admin' ? 'text-blue-600 font-medium' : ''}`}
          >
            Dashboard
          </Link>
          <Link 
            to="/admin/comments" 
            className={`hover:text-blue-600 ${location.pathname === '/admin/comments' ? 'text-blue-600 font-medium' : ''}`}
          >
            Comments Review
          </Link>
        </nav>
      </div>

      {/* Routes */}
      <Routes>
        <Route path="/" element={<AdminDashboard />} />
        <Route path="/users/:userId" element={<UserDetails userId={location.pathname.split('/').pop()} />} />
        <Route path="/comments" element={<CommentsReview />} />
      </Routes>
    </div>
  );
}

export default Admin; 