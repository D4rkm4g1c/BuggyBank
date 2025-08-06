import React, { useState, useEffect, useRef } from 'react';

function Chat({ user }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [isMinimized, setIsMinimized] = useState(true);
  const ws = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    connectWebSocket();
    
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const connectWebSocket = () => {
    try {
      // VULNERABILITY: Connect without proper authentication
      ws.current = new WebSocket('ws://localhost:3001/ws');
      
      ws.current.onopen = () => {
        setConnectionStatus('Connected');
        console.log('WebSocket connected');
        
        // Load existing messages when connected
        loadExistingMessages();
      };

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          // VULNERABILITY: Accept and display messages without sanitization
          setMessages(prev => [...prev, message]);
          
          console.log('Received message:', message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.current.onclose = () => {
        setConnectionStatus('Disconnected');
        console.log('WebSocket disconnected');
        
        // Attempt to reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000);
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('Error');
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      setConnectionStatus('Error');
    }
  };

  const loadExistingMessages = async () => {
    try {
      // Load existing messages from the database
      const response = await fetch('http://localhost:3001/api/admin/messages');
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Failed to load existing messages:', error);
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || !ws.current || ws.current.readyState !== WebSocket.OPEN) {
      return;
    }

    const message = {
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      content: inputMessage,
      type: 'user',
      timestamp: new Date().toISOString()
    };

    // VULNERABILITY: Send unsanitized message content
    ws.current.send(JSON.stringify(message));
    setInputMessage('');
  };

  const sendSystemMessage = () => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      return;
    }

    // VULNERABILITY: Allow any user to send system messages
    const systemMessage = {
      userId: user.id,
      username: user.username,
      content: inputMessage,
      type: 'system', // VULNERABILITY: Users can impersonate system
      timestamp: new Date().toISOString()
    };

    ws.current.send(JSON.stringify(systemMessage));
    setInputMessage('');
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getMessageTypeStyles = (type) => {
    switch (type) {
      case 'system':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'admin':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getMessageTypeIcon = (type) => {
    switch (type) {
      case 'system':
        return '⚠️';
      case 'admin':
        return '👑';
      default:
        return '💬';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-white border border-gray-300 rounded-lg shadow-lg">
      {/* Chat Header */}
      <div 
        className="bg-blue-600 text-white p-3 rounded-t-lg cursor-pointer flex justify-between items-center"
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <div className="flex items-center space-x-2">
          <span>💬</span>
          <span className="font-medium">BuggyBank Chat</span>
          <span className={`text-xs px-2 py-1 rounded ${
            connectionStatus === 'Connected' ? 'bg-green-500' : 
            connectionStatus === 'Error' ? 'bg-red-500' : 'bg-yellow-500'
          }`}>
            {connectionStatus}
          </span>
        </div>
        <button className="text-white hover:text-gray-200">
          {isMinimized ? '▲' : '▼'}
        </button>
      </div>

      {/* Chat Body */}
      {!isMinimized && (
        <div className="flex flex-col">
          {/* Messages Area */}
          <div className="h-64 overflow-y-auto p-3 space-y-2 bg-gray-50">
            {messages.length > 0 ? (
              messages.map((message, index) => (
                <div 
                  key={message.id || index} 
                  className={`p-2 rounded border ${getMessageTypeStyles(message.type)}`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium flex items-center space-x-1">
                      <span>{getMessageTypeIcon(message.type)}</span>
                      <span>
                        {message.fromUserId ? 
                          (message.displayName || message.username || `User ${message.fromUserId}`) : 
                          message.type === 'system' ? 'System' : 'Anonymous'
                        }
                      </span>
                      {message.type && message.type !== 'user' && (
                        <span className="bg-gray-200 px-1 rounded text-xs">
                          {message.type.toUpperCase()}
                        </span>
                      )}
                    </span>
                    <span className="text-gray-500">
                      {message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : 'Now'}
                    </span>
                  </div>
                  
                  {/* VULNERABILITY: Render message content without sanitization (stored XSS) */}
                  <div 
                    className="text-sm"
                    dangerouslySetInnerHTML={{ __html: message.content }}
                  />
                </div>
              ))
            ) : (
              <div className="text-gray-500 text-center text-sm">
                No messages yet. Start a conversation!
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 border-t bg-white rounded-b-lg">
            <form onSubmit={sendMessage} className="flex space-x-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type your message... (HTML supported)"
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
                disabled={connectionStatus !== 'Connected'}
              />
              <button
                type="submit"
                disabled={connectionStatus !== 'Connected' || !inputMessage.trim()}
                className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:bg-gray-300"
              >
                Send
              </button>
            </form>
            
            {/* VULNERABILITY: Allow users to send system messages */}
            <div className="mt-2 flex space-x-2">
              <button
                type="button"
                onClick={sendSystemMessage}
                disabled={connectionStatus !== 'Connected' || !inputMessage.trim()}
                className="px-2 py-1 bg-yellow-500 text-white rounded text-xs hover:bg-yellow-600 disabled:bg-gray-300"
              >
                Send as System
              </button>
              
              <button
                type="button"
                onClick={() => setInputMessage('<script>alert("XSS via WebSocket!")</script>')}
                className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
              >
                XSS Test
              </button>
              
              <button
                type="button"
                onClick={() => setInputMessage('<img src=x onerror=alert(document.cookie)>')}
                className="px-2 py-1 bg-purple-500 text-white rounded text-xs hover:bg-purple-600"
              >
                Cookie Steal
              </button>
            </div>

            {/* Vulnerability Notice */}
            <div className="mt-2 text-xs text-gray-600 bg-yellow-50 p-2 rounded">
              <strong>⚠️ Security Notice:</strong> This chat renders HTML without sanitization. 
              Try the test buttons to see XSS vulnerabilities in action.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Chat;