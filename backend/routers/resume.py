"""
resume.py

API endpoints for resume analysis.

Responsibilities:
- Accept PDF resume uploads.
- Extract text from the uploaded resume.
- Calculate a rule-based ATS score.
- Send the resume to the LLM for AI analysis.
- Stream the generated response back to the client.
"""

from fastapi import APIRouter, File, HTTPException, UploadFile
from sse_starlette.sse import EventSourceResponse

from prompts import RESUME_ANALYZER_PROMPT
from services.extract import extract_text_from_pdf
from services.ats_scorer import calculate_ats_score
from services.llm_client import stream_completion

# Create router instance


router = APIRouter()



# Resume Analysis Endpoint


@router.post("/analyze")
async def analyze_resume(file: UploadFile = File(...)):
    """
    Analyze an uploaded PDF resume.

    Parameters
    ----------
    file : UploadFile
        Resume uploaded by the user.

    Returns
    -------
    EventSourceResponse
        Streams AI-generated resume analysis.
    """

  
    # Validate uploaded file type
    

    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported."
        )

    # Read uploaded file into memory
    file_bytes = await file.read()

    try:
        # Extract text from the uploaded resume
        resume_text = extract_text_from_pdf(file_bytes)

        # Calculate rule-based ATS score
        ats_result = calculate_ats_score(resume_text)

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error)
        )

    # Build the user prompt for the LLM
    

    user_prompt = f"""
Resume Content:

{resume_text}

Current ATS Score:
{ats_result['ats_score']}/100

Rule-Based Feedback:
{chr(10).join(ats_result['feedback'])}

Provide a detailed resume review and suggest improvements.
"""

   
    # Stream AI response

    async def event_generator():
        """
        Streams the ATS score first, followed by
        the AI-generated resume analysis.
        """

        # Send ATS score
        yield {
            "event": "ats_score",
            "data": f"ATS Score: {ats_result['ats_score']}/100"
        }

        # Send rule-based feedback
        if ats_result["feedback"]:
            yield {
                "event": "feedback",
                "data": "\n".join(ats_result["feedback"])
            }

        # Stream AI response token-by-token
        for chunk in stream_completion(
            RESUME_ANALYZER_PROMPT,
            user_prompt,
        ):
            yield {
                "event": "message",
                "data": chunk,
            }

    return EventSourceResponse(event_generator())
