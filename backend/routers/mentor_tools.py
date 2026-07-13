from fastapi import APIRouter, Header
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from services.llm_client import stream_gemini_response
from prompts import (
    INTERVIEW_GENERATOR_PROMPT,
    DSA_PLANNER_PROMPT,
    LINKEDIN_OPTIMIZER_PROMPT,
    PROJECT_RECOMMENDER_PROMPT,
    LEARNING_RESOURCES_PROMPT
)

router = APIRouter(prefix="/mentor", tags=["mentor"])

# Request Schemas
class InterviewQuestionsRequest(BaseModel):
    target_role: str
    experience_level: str

class DsaPlannerRequest(BaseModel):
    target_role: str
    timeline: str
    current_level: str

class LinkedinOptimizerRequest(BaseModel):
    target_role: str
    resume_text: str

class ProjectRecommenderRequest(BaseModel):
    current_skills: str
    target_role: str

class LearningResourcesRequest(BaseModel):
    topic: str
    target_role: str


# Endpoints
@router.post("/interview-questions")
async def generate_interview_questions(
    req: InterviewQuestionsRequest,
    x_gemini_api_key: str = Header(None)
):
    """
    Generates tailored interview questions and preparation answers.
    """
    prompt = f"Generate technical and behavioral interview questions for the role: {req.target_role} with experience level/details: {req.experience_level}."
    system_instruction = INTERVIEW_GENERATOR_PROMPT.format(
        target_role=req.target_role,
        experience_level=req.experience_level
    )
    return StreamingResponse(
        stream_gemini_response(prompt, system_instruction, custom_api_key=x_gemini_api_key),
        media_type="text/event-stream"
    )

@router.post("/dsa-planner")
async def generate_dsa_plan(
    req: DsaPlannerRequest,
    x_gemini_api_key: str = Header(None)
):
    """
    Generates a personalized DSA upskilling and practice schedule.
    """
    prompt = f"Create a DSA study planner for the target role: {req.target_role}, preparation timeline: {req.timeline}, and current skills level: {req.current_level}."
    system_instruction = DSA_PLANNER_PROMPT.format(
        target_role=req.target_role,
        timeline=req.timeline,
        current_level=req.current_level
    )
    return StreamingResponse(
        stream_gemini_response(prompt, system_instruction, custom_api_key=x_gemini_api_key),
        media_type="text/event-stream"
    )

@router.post("/linkedin-optimizer")
async def optimize_linkedin(
    req: LinkedinOptimizerRequest,
    x_gemini_api_key: str = Header(None)
):
    """
    Generates LinkedIn profile optimization copy (Headline, About, Bullet Points).
    """
    prompt = f"Optimize a LinkedIn profile for target role: {req.target_role} using these resume details:\n{req.resume_text}"
    system_instruction = LINKEDIN_OPTIMIZER_PROMPT.format(
        target_role=req.target_role,
        resume_text=req.resume_text
    )
    return StreamingResponse(
        stream_gemini_response(prompt, system_instruction, custom_api_key=x_gemini_api_key),
        media_type="text/event-stream"
    )

@router.post("/project-recommendations")
async def recommend_projects(
    req: ProjectRecommenderRequest,
    x_gemini_api_key: str = Header(None)
):
    """
    Generates 3 unique portfolio project recommendations based on target goals and skills.
    """
    prompt = f"Recommend 3 specific portfolio project ideas for the target role: {req.target_role} matching current skills: {req.current_skills}."
    system_instruction = PROJECT_RECOMMENDER_PROMPT.format(
        current_skills=req.current_skills,
        target_role=req.target_role
    )
    return StreamingResponse(
        stream_gemini_response(prompt, system_instruction, custom_api_key=x_gemini_api_key),
        media_type="text/event-stream"
    )

@router.post("/learning-resources")
async def find_learning_resources(
    req: LearningResourcesRequest,
    x_gemini_api_key: str = Header(None)
):
    """
    Curates a list of top free resources for learning a specific technology or topic.
    """
    prompt = f"Suggest free learning resources for learning the topic: {req.topic} relevant to target role: {req.target_role}."
    system_instruction = LEARNING_RESOURCES_PROMPT.format(
        topic=req.topic,
        target_role=req.target_role
    )
    return StreamingResponse(
        stream_gemini_response(prompt, system_instruction, custom_api_key=x_gemini_api_key),
        media_type="text/event-stream"
    )
