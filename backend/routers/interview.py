"""
interview.py

API endpoints for the AI HR Mock Interview.

Responsibilities:
- Maintain conversation history using a session ID.
- Simulate a professional HR interview.
- Stream AI responses back to the frontend.

Note:
Conversation history is stored in memory for the MVP.
A production version would use Redis or a database.
"""

from fastapi import APIRouter
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse

from prompts import INTERVIEW_PROMPT
from services.llm_client import stream_completion


# Create router instance


router = APIRouter()


# In-memory conversation store
#
# Key:
#   session_id
#
# Value:
#   List of previous user messages.
#
# Example:
#
# interview_sessions = {
#     "abc123": [
#         "Tell me about yourself.",
#         "I recently graduated..."
#     ]
# }
#
# Note:
# This data will be cleared whenever the server restarts.


interview_sessions = {}


# Request Model


class InterviewRequest(BaseModel):
    session_id: str = Field(
        ...,
        example="session_001"
    )

    message: str = Field(
        ...,
        example="I am ready to begin the interview."
    )


# Interview Endpoint


@router.post("/chat")
async def chat(request: InterviewRequest):
    """
    Continue an HR mock interview.

    Parameters
    ----------
    request : InterviewRequest

    Returns
    -------
    EventSourceResponse
        Streams the interviewer's response.
    """

    
    # Create a new interview session if it doesn't exist.
 

    if request.session_id not in interview_sessions:
        interview_sessions[request.session_id] = []

    # Store the latest user response.
    interview_sessions[request.session_id].append(
        f"Candidate: {request.message}"
    )

    
    # Build conversation history.
    #
    # Passing previous messages allows the LLM to
    # maintain context across multiple interview rounds.
    

    conversation_history = "\n".join(
        interview_sessions[request.session_id]
    )

    user_prompt = f"""
Conversation History

{conversation_history}

Continue the HR interview.

Remember:

- Ask only ONE question at a time.
- Wait for the candidate's next response.
- Give brief feedback when appropriate.
"""

   
    # Stream the AI response.
    

    async def event_generator():

        full_response = ""

        for chunk in stream_completion(
            INTERVIEW_PROMPT,
            user_prompt,
        ):

            full_response += chunk

            yield {
                "event": "message",
                "data": chunk,
            }

        
        # Save the AI response so future requests retain context.
   

        interview_sessions[request.session_id].append(
            f"Interviewer: {full_response}"
        )

    return EventSourceResponse(event_generator())
