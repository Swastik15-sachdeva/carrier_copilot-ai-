// Global Application State
const state = {
  activeTab: 'resume-tab',
  apiKey: localStorage.getItem('gemini_api_key') || '',
  resumeFile: null,
  interviewSessionId: '',
  interviewTargetRole: '',
  isInterviewActive: false
};

// DOM Elements
const elements = {
  navItems: document.querySelectorAll('.nav-item'),
  tabPanes: document.querySelectorAll('.tab-pane'),
  pageTitle: document.getElementById('page-title'),
  apiStatus: document.getElementById('api-status'),
  settingsTrigger: document.getElementById('settings-trigger'),
  settingsModal: document.getElementById('settings-modal'),
  closeModalBtn: document.getElementById('close-modal-btn'),
  saveApiKeyBtn: document.getElementById('save-api-key-btn'),
  clearApiKeyBtn: document.getElementById('clear-api-key-btn'),
  apiKeyInput: document.getElementById('api-key-input'),
  
  // Resume Tab
  resumeForm: document.getElementById('resume-form'),
  resumeTargetRole: document.getElementById('resume-target-role'),
  resumeFile: document.getElementById('resume-file'),
  dropzone: document.getElementById('dropzone'),
  fileNameDisplay: document.getElementById('file-name-display'),
  fileNameText: document.querySelector('.file-name-text'),
  removeFileBtn: document.getElementById('remove-file-btn'),
  resumeEmptyState: document.getElementById('resume-empty-state'),
  resumeLoading: document.getElementById('resume-loading'),
  resumeResults: document.getElementById('resume-results'),
  atsScoreVal: document.getElementById('ats-score-val'),
  wordCountVal: document.getElementById('word-count-val'),
  contactInfoVal: document.getElementById('contact-info-val'),
  heuristicsChecklist: document.getElementById('heuristics-checklist'),
  resumeAiStream: document.getElementById('resume-ai-stream'),
  
  // Roadmap Tab
  roadmapForm: document.getElementById('roadmap-form'),
  roadmapSkills: document.getElementById('roadmap-skills'),
  roadmapTargetRole: document.getElementById('roadmap-target-role'),
  roadmapEmptyState: document.getElementById('roadmap-empty-state'),
  roadmapLoading: document.getElementById('roadmap-loading'),
  roadmapAiStream: document.getElementById('roadmap-ai-stream'),
  
  // Interview Tab
  interviewSetupForm: document.getElementById('interview-setup-form'),
  interviewRole: document.getElementById('interview-role'),
  startInterviewBtn: document.getElementById('start-interview-btn'),
  endInterviewBtn: document.getElementById('end-interview-btn'),
  chatMessages: document.getElementById('chat-messages'),
  chatInputForm: document.getElementById('chat-input-form'),
  chatInputText: document.getElementById('chat-input-text'),
  
  // Cover Letter Tab
  coverletterForm: document.getElementById('coverletter-form'),
  coverletterResume: document.getElementById('coverletter-resume'),
  coverletterJd: document.getElementById('coverletter-jd'),
  coverletterEmptyState: document.getElementById('coverletter-empty-state'),
  coverletterLoading: document.getElementById('coverletter-loading'),
  coverletterAiStream: document.getElementById('coverletter-ai-stream'),
  copyCoverLetterBtn: document.getElementById('copy-cover-letter-btn')
};

// Setup / Initialization
document.addEventListener('DOMContentLoaded', () => {
  updateApiStatusBadge();
  setupTabListeners();
  setupSettingsModalListeners();
  setupResumeUploadListeners();
  setupResumeForm();
  setupRoadmapForm();
  setupInterviewFlow();
  setupCoverLetterForm();
});

// Helper: Get Request Headers
function getHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (state.apiKey) {
    headers['X-Gemini-API-Key'] = state.apiKey;
  }
  return headers;
}

// API Status Badge Update
function updateApiStatusBadge() {
  const indicator = elements.apiStatus.querySelector('.status-indicator');
  const text = elements.apiStatus.querySelector('.status-text');
  
  if (state.apiKey) {
    indicator.className = 'status-indicator green';
    text.innerText = 'Live Gemini API';
  } else {
    indicator.className = 'status-indicator yellow';
    text.innerText = 'Demo Mode (Mock)';
  }
}

// Tab navigation controller
function setupTabListeners() {
  elements.navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tabId = item.getAttribute('data-tab');
      
      // Update sidebar nav states
      elements.navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');
      
      // Switch active tab pane
      elements.tabPanes.forEach(pane => pane.classList.remove('active'));
      document.getElementById(tabId).classList.add('active');
      
      // Update Top Page Title
      const labels = {
        'resume-tab': 'AI Resume Analyzer',
        'roadmap-tab': 'Personalized Career Roadmap',
        'interview-tab': 'HR Mock Interview',
        'coverletter-tab': 'Cover Letter Generator'
      };
      elements.pageTitle.innerText = labels[tabId];
      state.activeTab = tabId;
    });
  });
}

// Settings Modal Action handlers
function setupSettingsModalListeners() {
  elements.settingsTrigger.addEventListener('click', () => {
    elements.apiKeyInput.value = state.apiKey;
    elements.settingsModal.style.display = 'flex';
  });
  
  elements.closeModalBtn.addEventListener('click', () => {
    elements.settingsModal.style.display = 'none';
  });
  
  elements.saveApiKeyBtn.addEventListener('click', () => {
    const newKey = elements.apiKeyInput.value.trim();
    state.apiKey = newKey;
    localStorage.setItem('gemini_api_key', newKey);
    updateApiStatusBadge();
    elements.settingsModal.style.display = 'none';
  });
  
  elements.clearApiKeyBtn.addEventListener('click', () => {
    state.apiKey = '';
    localStorage.removeItem('gemini_api_key');
    elements.apiKeyInput.value = '';
    updateApiStatusBadge();
    elements.settingsModal.style.display = 'none';
  });
  
  // Close on backdrop click
  elements.settingsModal.addEventListener('click', (e) => {
    if (e.target === elements.settingsModal) {
      elements.settingsModal.style.display = 'none';
    }
  });
}

// Drag & Drop / File selection logic
function setupResumeUploadListeners() {
  const triggerFileSelect = () => elements.resumeFile.click();
  
  elements.dropzone.addEventListener('click', triggerFileSelect);
  
  elements.dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    elements.dropzone.classList.add('dragover');
  });
  
  elements.dropzone.addEventListener('dragleave', () => {
    elements.dropzone.classList.remove('dragover');
  });
  
  elements.dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    elements.dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  });
  
  elements.resumeFile.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFileSelected(e.target.files[0]);
    }
  });
  
  elements.removeFileBtn.addEventListener('click', () => {
    state.resumeFile = null;
    elements.resumeFile.value = '';
    elements.fileNameDisplay.style.display = 'none';
    elements.dropzone.style.display = 'flex';
  });
}

function handleFileSelected(file) {
  if (file.type !== 'application/pdf') {
    alert('Please upload a valid PDF file.');
    return;
  }
  state.resumeFile = file;
  elements.fileNameText.innerText = file.name;
  elements.dropzone.style.display = 'none';
  elements.fileNameDisplay.style.display = 'flex';
}

// Feature 1: Resume Analysis Form Submit
function setupResumeForm() {
  elements.resumeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!state.resumeFile) {
      alert('Please upload your resume PDF first.');
      return;
    }
    
    // UI state updates
    elements.resumeEmptyState.style.display = 'none';
    elements.resumeResults.style.display = 'none';
    elements.resumeLoading.style.display = 'flex';
    elements.resumeAiStream.innerHTML = '';
    elements.heuristicsChecklist.innerHTML = '';
    
    // Prepare form data
    const formData = new FormData();
    formData.append('target_role', elements.resumeTargetRole.value.trim());
    formData.append('file', state.resumeFile);
    
    try {
      const response = await fetch('/resume/analyze', {
        method: 'POST',
        headers: state.apiKey ? { 'X-Gemini-API-Key': state.apiKey } : {},
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Analysis server error.');
      }
      
      elements.resumeLoading.style.display = 'none';
      elements.resumeResults.style.display = 'block';
      
      await handleStreamReader(response.body, (type, text, data) => {
        if (type === 'json' && data.type === 'heuristics') {
          // Render heuristic scores
          elements.atsScoreVal.innerText = data.score;
          elements.wordCountVal.innerText = data.word_count;
          elements.contactInfoVal.innerText = (data.has_email && data.has_phone) ? 'Yes' : 'Partial';
          
          // Render Checklist
          renderResumeChecklist(data);
        } else if (type === 'text') {
          // Check for ATS_SCORE_ESTIMATE string in text (which Gemini writes sometimes)
          const cleanText = text.replace(/ATS_SCORE_ESTIMATE:\s*\d+/i, '');
          elements.resumeAiStream.innerHTML = formatMarkdown(cleanText);
        }
      });
      
    } catch (err) {
      elements.resumeLoading.style.display = 'none';
      elements.resumeEmptyState.style.display = 'flex';
      alert('Failed to analyze resume: ' + err.message);
    }
  });
}

function renderResumeChecklist(data) {
  const items = [
    { label: `Word count profile: ${data.word_count} words`, pass: data.word_count >= 300 && data.word_count <= 1000 },
    { label: 'Email address present', pass: data.has_email },
    { label: 'Phone number present', pass: data.has_phone },
    { label: `Action verbs used: ${data.action_verb_count} found`, pass: data.action_verb_count >= 5 },
    { label: `No critical formatting penalties applied`, pass: data.score > 60 }
  ];
  
  elements.heuristicsChecklist.innerHTML = items.map(item => `
    <li>
      <span class="check-icon ${item.pass ? 'pass' : 'fail'}">${item.pass ? '✓' : '✗'}</span>
      <span>${item.label}</span>
    </li>
  `).join('');
}

// Feature 2: Roadmap Generator Form Submit
function setupRoadmapForm() {
  elements.roadmapForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    elements.roadmapEmptyState.style.display = 'none';
    elements.roadmapAiStream.style.display = 'none';
    elements.roadmapLoading.style.display = 'flex';
    elements.roadmapAiStream.innerHTML = '';
    
    const requestBody = {
      current_skills: elements.roadmapSkills.value.trim(),
      target_role: elements.roadmapTargetRole.value.trim()
    };
    
    try {
      const response = await fetch('/roadmap/generate', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) throw new Error('Roadmap generation failed.');
      
      elements.roadmapLoading.style.display = 'none';
      elements.roadmapAiStream.style.display = 'block';
      
      await handleStreamReader(response.body, (type, text) => {
        if (type === 'text') {
          elements.roadmapAiStream.innerHTML = formatMarkdown(text);
        }
      });
      
    } catch (err) {
      elements.roadmapLoading.style.display = 'none';
      elements.roadmapEmptyState.style.display = 'flex';
      alert('Error creating roadmap: ' + err.message);
    }
  });
}

// Feature 3: HR Mock Interview Flow
function setupInterviewFlow() {
  elements.interviewSetupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    state.interviewSessionId = 'session_' + Math.random().toString(36).substring(2, 15);
    state.interviewTargetRole = elements.interviewRole.value.trim();
    state.isInterviewActive = true;
    
    // Toggle buttons
    elements.startInterviewBtn.style.display = 'none';
    elements.endInterviewBtn.style.display = 'block';
    elements.interviewRole.disabled = true;
    elements.chatInputForm.style.display = 'flex';
    
    elements.chatMessages.innerHTML = '<div class="chat-system-msg">Initializing mock interview session...</div>';
    
    // Request start message
    await triggerInterviewTurn('/start');
  });
  
  elements.endInterviewBtn.addEventListener('click', () => {
    concludeMockInterview();
  });
  
  elements.chatInputForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!state.isInterviewActive) return;
    
    const userMsg = elements.chatInputText.value.trim();
    if (!userMsg) return;
    
    elements.chatInputText.value = '';
    
    // Append user bubble
    appendChatBubble('user', userMsg);
    
    // Request answer
    await triggerInterviewTurn(userMsg);
  });
}

async function triggerInterviewTurn(userMessage) {
  // Show typing loader bubble
  const loaderId = appendChatLoader();
  
  const requestBody = {
    session_id: state.interviewSessionId,
    message: userMessage,
    target_role: state.interviewTargetRole
  };
  
  try {
    const response = await fetch('/interview/chat', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) throw new Error('Interviewer chat failed.');
    
    removeChatLoader(loaderId);
    
    // Append initial empty model bubble to stream into
    const bubbleId = appendChatBubble('model', '');
    const modelBubble = document.getElementById(bubbleId);
    
    await handleStreamReader(response.body, (type, text) => {
      if (type === 'text') {
        modelBubble.innerHTML = formatMarkdown(text);
        elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
        
        // Auto-detect finish text to stop
        if (text.includes('mock interview is complete')) {
          concludeMockInterview();
        }
      }
    });
    
  } catch (err) {
    removeChatLoader(loaderId);
    appendChatBubble('model', `[System Error: ${err.message}]`);
    concludeMockInterview();
  }
}

function appendChatBubble(role, text) {
  const id = 'bubble_' + Math.random().toString(36).substring(2, 9);
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${role}`;
  bubble.id = id;
  bubble.innerHTML = formatMarkdown(text);
  
  elements.chatMessages.appendChild(bubble);
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
  return id;
}

function appendChatLoader() {
  const id = 'loader_' + Math.random().toString(36).substring(2, 9);
  const loader = document.createElement('div');
  loader.className = 'chat-bubble model loader-bubble';
  loader.id = id;
  loader.innerHTML = '<span class="typing-indicator">Interviewer is typing...</span>';
  
  elements.chatMessages.appendChild(loader);
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
  return id;
}

function removeChatLoader(id) {
  const loader = document.getElementById(id);
  if (loader) loader.remove();
}

function concludeMockInterview() {
  state.isInterviewActive = false;
  elements.startInterviewBtn.style.display = 'block';
  elements.endInterviewBtn.style.display = 'none';
  elements.interviewRole.disabled = false;
  elements.chatInputForm.style.display = 'none';
  
  const systemMsg = document.createElement('div');
  systemMsg.className = 'chat-system-msg mt-4';
  systemMsg.innerText = 'Mock Interview Completed.';
  elements.chatMessages.appendChild(systemMsg);
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

// Feature 4: Cover Letter Generation Form Submit
function setupCoverLetterForm() {
  elements.coverletterForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    elements.coverletterEmptyState.style.display = 'none';
    elements.coverletterAiStream.style.display = 'none';
    elements.copyCoverLetterBtn.style.display = 'none';
    elements.coverletterLoading.style.display = 'flex';
    elements.coverletterAiStream.innerHTML = '';
    
    const requestBody = {
      resume_text: elements.coverletterResume.value.trim(),
      job_description: elements.coverletterJd.value.trim()
    };
    
    try {
      const response = await fetch('/cover-letter', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) throw new Error('Cover letter generation failed.');
      
      elements.coverletterLoading.style.display = 'none';
      elements.coverletterAiStream.style.display = 'block';
      elements.copyCoverLetterBtn.style.display = 'inline-flex';
      
      let fullText = '';
      await handleStreamReader(response.body, (type, text) => {
        if (type === 'text') {
          fullText = text;
          elements.coverletterAiStream.innerHTML = formatMarkdown(text);
        }
      });
      
      // Copy to clipboard setup
      elements.copyCoverLetterBtn.onclick = () => {
        navigator.clipboard.writeText(fullText).then(() => {
          elements.copyCoverLetterBtn.innerText = 'Copied!';
          setTimeout(() => {
            elements.copyCoverLetterBtn.innerText = 'Copy to Clipboard';
          }, 2000);
        });
      };
      
    } catch (err) {
      elements.coverletterLoading.style.display = 'none';
      elements.coverletterEmptyState.style.display = 'flex';
      alert('Error creating cover letter: ' + err.message);
    }
  });
}

// Global Streaming Response Reader Core Helper
async function handleStreamReader(body, callback) {
  const reader = body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let fullText = '';
  
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop(); // Keep last potentially partial block
      
      for (const line of lines) {
        if (line.trim().startsWith('data: ')) {
          const dataStr = line.replace('data: ', '').trim();
          
          // Check if data block is a JSON payload (heuristics)
          if (dataStr.startsWith('{') && dataStr.endsWith('}')) {
            try {
              const jsonPayload = JSON.parse(dataStr);
              callback('json', null, jsonPayload);
              continue;
            } catch (err) {
              // Not valid JSON, process as string token
            }
          }
          
          // Standard text token streaming
          fullText += dataStr;
          callback('text', fullText, null);
        }
      }
    }
    
    // Flush remaining buffer if it holds content
    if (buffer && buffer.trim().startsWith('data: ')) {
      const dataStr = buffer.replace('data: ', '').trim();
      fullText += dataStr;
      callback('text', fullText, null);
    }
  } catch (err) {
    console.error('Error during streaming read:', err);
    throw err;
  }
}

// Simple Markdown Formatter Helper
function formatMarkdown(text) {
  if (!text) return '';
  
  // Format headings: ### Heading or **Heading**
  let html = text
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
    .replace(/^\*\*([^*]+)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
  // Format code blocks
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Format bullet lists
  // Handles lines starting with * or - and converts them into <ul> list items
  const lines = html.split('\n');
  let inList = false;
  const processedLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (line.startsWith('* ') || line.startsWith('- ')) {
      if (!inList) {
        processedLines.push('<ul>');
        inList = true;
      }
      processedLines.push(`<li>${line.substring(2)}</li>`);
    } else {
      if (inList) {
        processedLines.push('</ul>');
        inList = false;
      }
      if (line !== '') {
        processedLines.push(`<p>${line}</p>`);
      }
    }
  }
  
  if (inList) {
    processedLines.push('</ul>');
  }
  
  return processedLines.join('\n');
}
