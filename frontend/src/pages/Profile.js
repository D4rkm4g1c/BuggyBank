import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Profile({ user, setUser }) {
  const [formData, setFormData] = useState({
    displayName: user.displayName || '',
    email: user.email || ''
  });
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadComments();
  }, []);

  const loadComments = async () => {
    try {
      // VULNERABILITY: Public access to comments endpoint
      const response = await axios.get('/admin/comments');
      setComments(response.data.comments);
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  };

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

    try {
      await axios.put('/users/profile', formData);
      
      // Update user state
      setUser({
        ...user,
        displayName: formData.displayName,
        email: formData.email
      });
      
      setMessage('Profile updated successfully!');
    } catch (error) {
      console.error('Profile update failed:', error);
      
      // VULNERABILITY: Display SQL errors
      if (error.response?.data?.sqlError) {
        setError(`Database Error: ${error.response.data.sqlError}`);
      } else {
        setError(error.response?.data?.error || 'Update failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const submitComment = async (e) => {
    e.preventDefault();
    
    if (!comment.trim()) return;

    try {
      // Store comment for admin review (XSS vector)
      const response = await axios.post('/admin/comments', {
        userId: user.id,
        content: comment
      });
      
      setComment('');
      setMessage('Comment submitted for admin review!');
      loadComments();
    } catch (error) {
      console.error('Comment submission failed:', error);
      setError('Failed to submit comment');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-6">Profile Information</h2>
        
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
              placeholder="HTML tags are supported for rich formatting"
            />
            <p className="text-xs text-gray-500 mt-1">
              Current display: <span dangerouslySetInnerHTML={{ __html: formData.displayName }} />
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
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Updating...' : 'Update Profile'}
          </button>
        </form>
      </div>

      {/* User Information Display */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Account Details</h3>
        <div className="space-y-2 text-sm">
          <p><strong>Username:</strong> {user.username}</p>
          <p><strong>User ID:</strong> {user.id}</p>
          <p><strong>Role:</strong> {user.role}</p>
          <p><strong>Balance:</strong> ${user.balance?.toFixed(2)}</p>
          
          {/* VULNERABILITY: Expose sensitive session information */}
          <p><strong>Session ID:</strong> <code className="text-xs bg-gray-100 p-1">{localStorage.getItem('sessionId')}</code></p>
          <p><strong>Auth Token:</strong> <code className="text-xs bg-gray-100 p-1 break-all">{localStorage.getItem('authToken')?.substring(0, 50)}...</code></p>
        </div>
      </div>

      {/* Feedback/Comments Section for XSS */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Submit Feedback</h3>
        <p className="text-sm text-gray-600 mb-4">
          Submit feedback or comments for admin review. HTML content is supported for rich formatting.
        </p>
        
        <form onSubmit={submitComment} className="space-y-4">
          <div>
            <label htmlFor="comment" className="block text-sm font-medium text-gray-700">
              Your Feedback
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="vulnerable-input w-full mt-1"
              rows="4"
              placeholder="You can use HTML tags like <b>, <i>, <script>, etc."
            />
          </div>
          
          <button type="submit" className="btn-primary">
            Submit Feedback
          </button>
        </form>
      </div>

      {/* Display Comments with XSS */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Feedback</h3>
        
        {comments.length > 0 ? (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="border-l-4 border-blue-500 pl-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {comment.displayName || comment.username} 
                      <span className="text-gray-500 ml-2">({comment.role})</span>
                    </p>
                    {/* VULNERABILITY: Render comment content without sanitization (stored XSS) */}
                    <div 
                      className="mt-1 text-gray-700"
                      dangerouslySetInnerHTML={{ __html: comment.content }}
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(comment.created_at).toLocaleString()}
                      {comment.isReviewed && <span className="ml-2 text-green-600">✓ Reviewed</span>}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No feedback submitted yet.</p>
        )}
      </div>

      {/* VULNERABILITY: CSP bypass demonstration */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-medium text-yellow-800">Security Test Zone</h4>
        <p className="text-sm text-yellow-700 mt-1">
          This section demonstrates CSP bypass techniques. Try loading scripts from allowed domains.
        </p>
        
        {/* VULNERABILITY: Allow script loading from CDN for CSP bypass testing */}
        <script src="https://cdn.buggybank.net/test.js" async></script>
        
        <div className="mt-2">
          <button 
            onClick={() => {
              // VULNERABILITY: Eval user input from localStorage
              const userScript = localStorage.getItem('userScript');
              if (userScript) {
                eval(userScript);
              }
            }}
            className="text-sm bg-yellow-200 hover:bg-yellow-300 px-2 py-1 rounded"
          >
            Execute User Script from localStorage
          </button>
        </div>
      </div>
    </div>
  );
}

export default Profile; 