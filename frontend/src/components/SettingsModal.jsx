import React, { useState, useEffect } from 'react';

export default function SettingsModal({ isOpen, onClose, apiKey, onSaveKey }) {
  const [keyInput, setKeyInput] = useState(apiKey);

  useEffect(() => {
    setKeyInput(apiKey);
  }, [apiKey]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveKey(keyInput.trim());
    onClose();
  };

  const handleClear = () => {
    setKeyInput('');
    onSaveKey('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>API Configuration</h3>
          <button className="close-modal-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <p>To connect live streaming capabilities to Google's Gemini models, enter your Gemini API key below.</p>
          
          <div className="form-group mt-3">
            <label htmlFor="api-key-input">Gemini API Key</label>
            <input 
              type="password" 
              id="api-key-input" 
              placeholder="AIzaSy..." 
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
            />
            <small className="help-text">
              This key is saved locally in your browser's <code>localStorage</code> and never sent elsewhere.
            </small>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-danger" onClick={handleClear}>Clear Key</button>
          <button className="btn btn-primary" onClick={handleSave}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}
