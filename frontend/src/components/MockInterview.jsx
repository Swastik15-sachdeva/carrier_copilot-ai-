import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { readStream } from '../utils/stream';

export default function MockInterview() {
  const [targetRole, setTargetRole] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [streamingMessage, setStreamingMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);

  const cleanMarkdownForSpeech = (text) => {
    if (!text) return '';
    return text
      .replace(/[*_~`#\-+]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/<[^>]*>/g, '')
      .trim();
  };

  const speak = (text) => {
    if (!ttsEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const cleaned = cleanMarkdownForSpeech(text);
    if (!cleaned) return;
    const utterance = new SpeechSynthesisUtterance(cleaned);
    const voices = window.speechSynthesis.getVoices();
    const defaultVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
    if (defaultVoice) {
      utterance.voice = defaultVoice;
    }
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (!ttsEnabled) {
      window.speechSynthesis?.cancel();
    }
  }, [ttsEnabled]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsRecording(true);
      };

      rec.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setUserInput((prev) => (prev ? prev + ' ' + transcript : transcript));
      };

      rec.onerror = (e) => {
        console.error("Speech recognition error", e);
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
    }
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert("Speech Recognition API is not supported in this browser.");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error("Failed to start speech recognition", err);
      }
    }
  };

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
      setLoading(false);
      speak(content);
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
      setLoading(false);
      speak(content);
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
      setLoading(false);
      speak(content);
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
        <div className="panel-header-actions">
          <h2 className="card-title">Interview Sandbox</h2>
          {isActive && (
            <button 
              type="button" 
              className={`tts-btn ${ttsEnabled ? 'active' : ''}`}
              onClick={() => setTtsEnabled(!ttsEnabled)}
              title={ttsEnabled ? "Mute AI Voice" : "Enable AI Voice"}
            >
              {ttsEnabled ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                  <line x1="23" y1="9" x2="17" y2="15"></line>
                  <line x1="17" y1="9" x2="23" y2="15"></line>
                </svg>
              )}
            </button>
          )}
        </div>
        
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
              <div style={{ position: 'relative', display: 'flex', flexGrow: 1, alignItems: 'center' }}>
                <input 
                  type="text" 
                  placeholder="Type your answer here..." 
                  required 
                  autoComplete="off"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  disabled={loading}
                  style={{ paddingRight: '45px' }}
                />
                <button 
                  type="button" 
                  className={`mic-btn ${isRecording ? 'listening' : ''}`}
                  onClick={toggleRecording}
                  disabled={loading}
                  title={isRecording ? "Stop Recording" : "Dictate Answer"}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    outline: 'none',
                    zIndex: 10
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                    <line x1="12" y1="19" x2="12" y2="23"></line>
                    <line x1="8" y1="23" x2="16" y2="23"></line>
                  </svg>
                </button>
              </div>
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
