from fastapi import APIRouter, Header
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from services.llm_client import stream_gemini_response
from prompts import INTERVIEW_SYSTEM_PROMPT

router = APIRouter(prefix="/interview", tags=["interview"])

# In-memory dictionary to store session state:
# { session_id: { "target_role": "...", "history": [{"role": "user"/"model", "parts": [{"text": "..."}]}] } }
sessions = {}

class InterviewRequest(BaseModel):
    session_id: str
    message: str
    target_role: str = "Software Engineer"

@router.post("/chat")
async def interview_chat(
    req: InterviewRequest,
    x_gemini_api_key: str = Header(None)
):
    """
    Endpoint that handles multi-turn conversational mock interview steps.
    Keeps conversation history in-memory and streams back response from Gemini.
    """
    session_id = req.session_id
    
    # Initialize session if not exists
    if session_id not in sessions:
        sessions[session_id] = {
            "target_role": req.target_role,
            "history": []
        }
    
    session = sessions[session_id]
    target_role = session["target_role"]
    history = session["history"]
    
    system_instruction = INTERVIEW_SYSTEM_PROMPT.format(target_role=target_role)

    # Prepare current prompt content
    if req.message == "/start" or req.message.strip() == "":
        # Start command: call LLM to introduce and ask the first question
        prompt_content = "Introduce yourself as the mock interviewer, state the role, and ask the first question."
    else:
        # Standard conversation turn: append user's response to history
        history.append({
            "role": "user",
            "parts": [{"text": req.message}]
        })
        # Pass full history to Gemini
        prompt_content = history

    # We need to capture the streamed output to append it to history for future turns.
    # We will wrap the streaming response.
    async def response_accumulator_generator():
        full_response = ""
        # Using a copy/reference of prompt_content
        async for chunk in stream_gemini_response(prompt_content, system_instruction, custom_api_key=x_gemini_api_key):
            yield chunk
            
            # Extract the actual token from the SSE chunk format: "data: <token>\n\n"
            if chunk.startswith("data: ") and chunk.endswith("\n\n"):
                token = chunk[6:-2]
                full_response += token
        
        # Once stream finishes, store model's response in history
        if full_response.strip():
            history.append({
                "role": "model",
                "parts": [{"text": full_response}]
            })

    return StreamingResponse(response_accumulator_generator(), media_type="text/event-stream")

