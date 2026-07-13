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
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      // Keep the last partial line in the buffer
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;

        const dataStr = trimmed.slice(6); // Remove "data: "

        // Try to parse as heuristics JSON first
        if (dataStr.startsWith("{") && dataStr.includes('"type":"heuristics"')) {
          try {
            const heuristics = JSON.parse(dataStr);
            if (onHeuristics) {
              onHeuristics(heuristics);
            }
            continue;
          } catch (e) {
            // If parsing failed, treat it as text chunk fallback
            console.error("Failed to parse heuristics JSON:", e);
          }
        }

        // Otherwise treat as standard text stream chunk
        if (onChunk) {
          onChunk(dataStr);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
