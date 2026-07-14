import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { readStream } from '../utils/stream';

export default function CoverLetter() {
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [letterContent, setLetterContent] = useState('');
  const abortControllerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setLetterContent('');

    const headers = { 'Content-Type': 'application/json' };

    try {
      const response = await fetch('/cover-letter', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          resume_text: resumeText.trim(),
          job_description: jobDescription.trim()
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error('Letter generation server error.');
      }

      await readStream(
        response,
        (chunk) => {
          setLetterContent((prev) => prev + chunk);
        }
      );

      setLoading(false);
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error(error);
      alert('An error occurred during cover letter generation.');
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!letterContent) return;
    navigator.clipboard.writeText(letterContent);
    alert('Cover letter copied to clipboard!');
  };

  return (
    <div className="grid-layout">
      {/* Left Input Card */}
      <div className="card">
        <h2 className="card-title">Tailor Cover Letter</h2>
        <p className="card-subtitle">Paste your resume highlights and the job requirements to generate a tailored cover letter.</p>
        
        <form onSubmit={handleSubmit} className="app-form">
          <div className="form-group">
            <label htmlFor="coverletter-resume">Resume Highlights / Text</label>
            <textarea 
              id="coverletter-resume" 
              placeholder="Paste key bullet points or summary from your resume..." 
              rows={5} 
              required
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="coverletter-jd">Job Description</label>
            <textarea 
              id="coverletter-jd" 
              placeholder="Paste the key job requirements, skills, and company culture descriptions..." 
              rows={5} 
              required
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
          </div>
          
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Drafting...' : 'Generate Cover Letter'}
          </button>
        </form>
      </div>
      
      {/* Right Output Panel */}
      <div className="card result-panel">
        <div className="panel-header-actions">
          <h2 className="card-title">Tailored Cover Letter</h2>
          {letterContent && (
            <button className="btn btn-secondary btn-sm" onClick={handleCopy}>
              Copy to Clipboard
            </button>
          )}
        </div>
        
        {!loading && !letterContent && (
          <div className="empty-state">
            <span className="empty-icon">✉️</span>
            <h3>Generate customized letter</h3>
            <p>Provide your resume and job description on the left. The AI will write a highly targeted application letter.</p>
          </div>
        )}

        {loading && !letterContent && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Drafting customized cover letter...</p>
          </div>
        )}

        {letterContent && (
          <div className="stream-output markdown-body">
            <ReactMarkdown>{letterContent}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
