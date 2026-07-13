import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { readStream } from '../utils/stream';

export default function MockInterview({ apiKey }) {
  const [targetRole, setTargetRole] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [streamingMessage, setStreamingMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const chatEndRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingMessage]);

  const startInterview = async (e) => {
    e.preventDefault();
    if (!targetRole.trim()) return;

    const newSessionId = 'session_' + Date.now();
    setSessionId(newSessionId);
    setIsActive(true);
    setMessages([]);
    setLoading(true);
    setStreamingMessage('');

    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) {
      headers['X-Gemini-API-Key'] = apiKey;
    }

    try {
      const response = await fetch('/interview/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          session_id: newSessionId,
          message: '/start',
          target_role: targetRole.trim()
        })
      });

      if (!response.ok) {
        throw new Error('Interview setup error.');
      }

      setLoading(false);
      let content = '';
      
      await readStream(
        response,
        (chunk) => {
          content += chunk;
          setStreamingMessage(content);
        }
      );

      setMessages([{ role: 'model', text: content }]);
      setStreamingMessage('');
    } catch (error) {
      console.error(error);
      alert('Failed to start mock interview.');
      setIsActive(false);
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!userInput.trim() || loading) return;

    const textToSend = userInput.trim();
    setUserInput('');
    setMessages((prev) => [...prev, { role: 'user', text: textToSend }]);
    setLoading(true);
    setStreamingMessage('');

    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) {
      headers['X-Gemini-API-Key'] = apiKey;
    }

    try {
      const response = await fetch('/interview/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          session_id: sessionId,
          message: textToSend,
          target_role: targetRole.trim()
        })
      });

      if (!response.ok) {
        throw new Error('Chat server error.');
      }

      setLoading(false);
      let content = '';

      await readStream(
        response,
        (chunk) => {
          content += chunk;
          setStreamingMessage(content);
        }
      );

      setMessages((prev) => [...prev, { role: 'model', text: content }]);
      setStreamingMessage('');
    } catch (error) {
      console.error(error);
      alert('An error occurred during communication.');
      setLoading(false);
    }
  };

  const endInterview = async () => {
    if (loading) return;
    
    // Send a final message requesting the evaluation scorecard
    setUserInput('');
    setMessages((prev) => [...prev, { role: 'user', text: 'I want to end the interview now. Please provide my evaluation review.' }]);
    setLoading(true);
    setStreamingMessage('');

    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) {
      headers['X-Gemini-API-Key'] = apiKey;
    }

    try {
      const response = await fetch('/interview/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          session_id: sessionId,
          message: 'I want to end the interview now. Please provide my evaluation review.',
          target_role: targetRole.trim()
        })
      });

      if (!response.ok) {
        throw new Error('Termination error.');
      }

      setLoading(false);
      let content = '';

      await readStream(
        response,
        (chunk) => {
          content += chunk;
          setStreamingMessage(content);
        }
      );

      setMessages((prev) => [...prev, { role: 'model', text: content }]);
      setStreamingMessage('');
    } catch (error) {
      console.error(error);
      alert('Failed to end interview gracefully.');
      setLoading(false);
    }
  };

  const forceReset = () => {
    setIsActive(false);
    setMessages([]);
    setStreamingMessage('');
    setSessionId('');
  };

  return (
    <div className="grid-layout">
      {/* Left Settings Panel */}
      <div className="card">
        <h2 className="card-title">Interview Configuration</h2>
        <p className="card-subtitle">Set up your target role to begin a step-by-step recruiter behavioral round simulation.</p>
        
        {!isActive ? (
          <form onSubmit={startInterview} className="app-form">
            <div className="form-group">
              <label htmlFor="interview-role">Target Job Role</label>
              <input 
                type="text" 
                id="interview-role" 
                placeholder="e.g. Software Engineer, QA Specialist" 
                required
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
              />
            </div>
            
            <button type="submit" className="btn btn-primary btn-full">
              Start Mock Interview
            </button>
          </form>
        ) : (
          <div className="app-form">
            <div className="form-group">
              <label>Active Target Role</label>
              <input type="text" value={targetRole} disabled />
            </div>
            <button type="button" className="btn btn-danger btn-full" onClick={endInterview} disabled={loading}>
              End Interview Gracefully
            </button>
            <button type="button" className="btn btn-secondary btn-full mt-4" onClick={forceReset}>
              Reset Interview Console
            </button>
          </div>
        )}

        <div className="interview-instructions mt-4">
          <h4>Guidelines:</h4>
          <ul>
            <li>The AI acts as an HR recruiter.</li>
            <li>It will ask <strong>one question at a time</strong>.</li>
            <li>Type your answer in the chat panel.</li>
            <li>You will receive feedback on your communications at the end of the session.</li>
          </ul>
        </div>
      </div>
      
      {/* Right Chat Sandbox */}
      <div className="card interview-console-card">
        <h2 className="card-title">Interview Sandbox</h2>
        
        <div className="chat-container">
          <div className="chat-messages">
            {!isActive && (
              <div className="chat-system-msg">
                No active interview. Enter a target role and click "Start Mock Interview" to begin.
              </div>
            )}

            {isActive && messages.map((msg, idx) => (
              <div key={idx} className={`chat-bubble ${msg.role}`}>
                {msg.role === 'model' ? (
                  <div className="markdown-body">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                ) : (
                  msg.text
                )}
              </div>
            ))}

            {streamingMessage && (
              <div className="chat-bubble model">
                <div className="markdown-body">
                  <ReactMarkdown>{streamingMessage}</ReactMarkdown>
                </div>
              </div>
            )}

            {loading && !streamingMessage && (
              <div className="chat-bubble model">
                <div className="spinner" style={{ width: '20px', height: '20px' }}></div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>
          
          {isActive && (
            <form onSubmit={handleSendMessage} className="chat-input-form">
              <input 
                type="text" 
                placeholder="Type your answer here..." 
                required 
                autoComplete="off"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                disabled={loading}
              />
              <button type="submit" className="btn btn-primary send-btn" disabled={loading}>
                Send
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
