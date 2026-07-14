/**
 * Utility to read and decode a server-sent events (SSE) stream from the backend.
 * Calls onChunk for each text snippet, and onHeuristics for parsed JSON checklist details.
 */
export async function readStream(response, onChunk, onHeuristics) {
  if (!response.body) {
    throw new Error("No response body to stream.");
  }
  
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      
      if (value) {
        buffer += decoder.decode(value, { stream: true });
      }
      
      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const message = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        
        processMessage(message, onChunk, onHeuristics);
        
        boundary = buffer.indexOf("\n\n");
      }
      
      if (done) {
        const remaining = buffer.trim();
        if (remaining) {
          processMessage(remaining, onChunk, onHeuristics);
        }
        break;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function processMessage(message, onChunk, onHeuristics) {
  const cleanMessage = message.replace(/\r/g, "");
  
  if (cleanMessage.startsWith("data: ")) {
    const dataStr = cleanMessage.slice(6);
    
    // Check for heuristics JSON
    if (dataStr.startsWith("{") && dataStr.includes('"type"') && dataStr.includes('"heuristics"')) {
      try {
        const heuristics = JSON.parse(dataStr);
        if (onHeuristics) {
          onHeuristics(heuristics);
        }
      } catch (e) {
        console.error("Failed to parse heuristics JSON:", e);
      }
    } else {
      if (onChunk) {
        onChunk(dataStr);
      }
    }
  } else {
    // Treat as continuation of a text chunk split by \n\n message boundary
    if (onChunk && cleanMessage.trim() !== "") {
      onChunk("\n\n" + cleanMessage);
    }
  }
}
