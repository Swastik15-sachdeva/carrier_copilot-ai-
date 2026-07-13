"""
cover_letter.py

API endpoints for AI-generated cover letters.

Responsibilities:
- Receive resume text and job description.
- Build a prompt for the LLM.
- Stream a personalized cover letter back to the client.

This endpoint does not require a PDF upload because
the frontend sends the extracted resume text.
"""

from fastapi import APIRouter
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse

from prompts import COVER_LETTER_PROMPT
from services.llm_client import stream_completion


# Create router instance


router = APIRouter()



# Request Model
#
# Validates the incoming JSON request automatically.


class CoverLetterRequest(BaseModel):

    resume_text: str = Field(
        ...,
        example="Experienced Python developer with FastAPI and SQL."
    )

    job_description: str = Field(
        ...,
        example="Looking for a Backend Developer skilled in Python."
    )



# Cover Letter Generation Endpoint


@router.post("/")
async def generate_cover_letter(request: CoverLetterRequest):
    """
    Generate a personalized cover letter.

    Parameters
    ----------
    request : CoverLetterRequest

    Returns
    -------
    EventSourceResponse
        Streams the generated cover letter.
    """

  
    # Build the prompt using the resume and job description.
   

    user_prompt = f"""
Candidate Resume

{request.resume_text}

--------------------------------------------------

Job Description

{request.job_description}

--------------------------------------------------

Write a professional cover letter that:

- Matches the candidate's experience to the job.
- Highlights the most relevant skills.
- Uses a confident and professional tone.
- Keeps the content concise.
- Ends with a polite closing statement.
"""

  
    # Stream the generated cover letter.
   

    async def event_generator():
        """
        Streams the cover letter progressively so the
        frontend can display it in real time.
        """

        for chunk in stream_completion(
            COVER_LETTER_PROMPT,
            user_prompt,
        ):

            yield {
                "event": "message",
                "data": chunk,
            }

    return EventSourceResponse(event_generator())
