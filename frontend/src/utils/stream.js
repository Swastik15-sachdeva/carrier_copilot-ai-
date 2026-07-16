/**
 * Utility to read and decode a server-sent events (SSE) stream from the backend.
 * Calls onChunk for each text snippet, and onHeuristics for parsed JSON checklist details.
 */
export async function readStream(response, onChunk, onHeuristics, onTelemetry) {
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
        
        processMessage(message, onChunk, onHeuristics, onTelemetry);
        
        boundary = buffer.indexOf("\n\n");
      }
      
      if (done) {
        const remaining = buffer.trim();
        if (remaining) {
          processMessage(remaining, onChunk, onHeuristics, onTelemetry);
        }
        break;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function cleanMathExpressions(text) {
  if (!text) return text;
  let cleaned = text;
  
  // Replace display math $$...$$
  cleaned = cleaned.replace(/\$\$([^\$]+)\$\$/g, (match, p1) => {
    return cleanMathInner(p1);
  });
  
  // Replace inline math $...$
  cleaned = cleaned.replace(/\$([^\$]+)\$/g, (match, p1) => {
    if (/^\d+(\.\d+)?\s*[a-zA-Z]?$/.test(p1.trim())) {
      return match;
    }
    const trimmed = p1.trim();
    const isMath = /^[OoQqθωΘΩ]\(/.test(trimmed) || 
                   trimmed.includes('\\') || 
                   trimmed.includes('^') || 
                   trimmed.includes('+') || 
                   trimmed.includes('-') || 
                   trimmed.includes('*') || 
                   trimmed.includes('/') ||
                   trimmed.length === 1 ||
                   /^(log|n|v|e|w|k|v\+e)$/i.test(trimmed);
                   
    if (isMath) {
      return cleanMathInner(p1);
    }
    return match;
  });
  
  return cleaned;
}

function cleanMathInner(mathText) {
  return mathText
    .replace(/\\(log|times|theta|omega|alpha|beta|gamma|delta|le|ge|ne|approx|in|cup|cap|subset|subseteq|empty)/gi, '$1')
    .replace(/\\/g, '');
}

function processMessage(message, onChunk, onHeuristics, onTelemetry) {
  const cleanMessage = message.replace(/\r/g, "");
  const trimmed = cleanMessage.trim();
  
  if (trimmed.startsWith("data: ")) {
    // Split the message by newlines, strip the "data: " prefix from each line,
    // and join them back. This handles multi-line data payloads cleanly.
    const lines = cleanMessage.split("\n");
    const processedLines = lines.map(line => {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith("data: ")) {
        const idx = line.indexOf("data: ");
        return line.slice(idx + 6);
      } else if (trimmedLine === "data:") {
        return "";
      }
      return line;
    });
    
    const dataStr = processedLines.join("\n");
    
    // Check for heuristics JSON
    if (dataStr.trim().startsWith("{") && dataStr.includes('"type"') && dataStr.includes('"heuristics"')) {
      try {
        const heuristics = JSON.parse(dataStr.trim());
        if (onHeuristics) {
          onHeuristics(heuristics);
        }
      } catch (e) {
        console.error("Failed to parse heuristics JSON:", e);
        if (onChunk) {
          onChunk(cleanMathExpressions(dataStr));
        }
      }
    } else if (dataStr.trim().startsWith("{") && dataStr.includes('"type"') && dataStr.includes('"telemetry"')) {
      try {
        const telemetry = JSON.parse(dataStr.trim());
        if (onTelemetry) {
          onTelemetry(telemetry);
        }
      } catch (e) {
        console.error("Failed to parse telemetry JSON:", e);
      }
    } else {
      if (onChunk) {
        onChunk(cleanMathExpressions(dataStr));
      }
    }
  } else {
    // Treat as continuation of a text chunk split by \n\n message boundary
    if (onChunk && cleanMessage.trim() !== "") {
      onChunk(cleanMathExpressions("\n\n" + cleanMessage));
    }
  }
}
