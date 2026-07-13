f
"""
roadmap.py

API endpoints for generating personalized career roadmaps.

Responsibilities:
- Receive the user's current skills and target role.
- Build a structured prompt for the LLM.
- Stream the generated roadmap back to the frontend.
"""

from fastapi import APIRouter
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse

from prompts import ROADMAP_PROMPT
from services.llm_client import stream_completion


# Create router instance


router = APIRouter()



# Request Model
#
# Pydantic automatically validates incoming JSON requests.


class RoadmapRequest(BaseModel):
    current_skills: str = Field(
        ...,
        example="Python, SQL, Git"
    )

    target_role: str = Field(
        ...,
        example="Backend Developer"
    )



# Roadmap Generation Endpoint


@router.post("/generate")
async def generate_roadmap(request: RoadmapRequest):
    """
    Generate a personalized career roadmap.

    Parameters
    ----------
    request : RoadmapRequest
        Contains the user's current skills and desired role.

    Returns
    -------
    EventSourceResponse
        Streams the generated roadmap.
    """

    
    # Build prompt using the user's information
    

    user_prompt = f"""
Current Skills:
{request.current_skills}

Target Role:
{request.target_role}

Generate a personalized roadmap that includes:

1. Learning Phases
2. Skills to Learn
3. Recommended Projects
4. Career Tips
5. Helpful Learning Resources
"""


    # Stream AI response
   

    async def event_generator():
        """
        Streams the roadmap progressively to the frontend.
        """

        for chunk in stream_completion(
            ROADMAP_PROMPT,
            user_prompt,
        ):
            yield {
                "event": "message",
                "data": chunk,
            }

    return EventSourceResponse(event_generator())
