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

# In-memory Caches
interview_questions_cache = {}
dsa_planner_cache = {}
linkedin_optimizer_cache = {}
project_recommender_cache = {}
learning_resources_cache = {}

# Endpoints
@router.post("/interview-questions")
async def generate_interview_questions(
    req: InterviewQuestionsRequest,
    x_gemini_api_key: str = Header(None)
):
    """
    Generates tailored interview questions and preparation answers.
    """
    cache_key = (req.target_role.strip().lower(), req.experience_level.strip().lower())
    if cache_key in interview_questions_cache:
        print("Serving interview questions from cache!")
        async def cached_generator():
            for chunk in interview_questions_cache[cache_key]:
                yield chunk
        return StreamingResponse(
            cached_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )

    prompt = f"Generate technical and behavioral interview questions for the role: {req.target_role} with experience level/details: {req.experience_level}."
    system_instruction = INTERVIEW_GENERATOR_PROMPT.format(
        target_role=req.target_role,
        experience_level=req.experience_level
    )
    
    accumulated_chunks = []
    async def caching_generator():
        async for chunk in stream_gemini_response(prompt, system_instruction, custom_api_key=x_gemini_api_key):
            accumulated_chunks.append(chunk)
            yield chunk
        interview_questions_cache[cache_key] = accumulated_chunks

    return StreamingResponse(
        caching_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@router.post("/dsa-planner")
async def generate_dsa_plan(
    req: DsaPlannerRequest,
    x_gemini_api_key: str = Header(None)
):
    """
    Generates a personalized DSA upskilling and practice schedule.
    """
    cache_key = (req.target_role.strip().lower(), req.timeline.strip().lower(), req.current_level.strip().lower())
    if cache_key in dsa_planner_cache:
        print("Serving DSA plan from cache!")
        async def cached_generator():
            for chunk in dsa_planner_cache[cache_key]:
                yield chunk
        return StreamingResponse(
            cached_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )

    prompt = f"Create a DSA study planner for the target role: {req.target_role}, preparation timeline: {req.timeline}, and current skills level: {req.current_level}."
    system_instruction = DSA_PLANNER_PROMPT.format(
        target_role=req.target_role,
        timeline=req.timeline,
        current_level=req.current_level
    )
    
    accumulated_chunks = []
    async def caching_generator():
        async for chunk in stream_gemini_response(prompt, system_instruction, custom_api_key=x_gemini_api_key):
            accumulated_chunks.append(chunk)
            yield chunk
        dsa_planner_cache[cache_key] = accumulated_chunks

    return StreamingResponse(
        caching_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@router.post("/linkedin-optimizer")
async def optimize_linkedin(
    req: LinkedinOptimizerRequest,
    x_gemini_api_key: str = Header(None)
):
    """
    Generates LinkedIn profile optimization copy (Headline, About, Bullet Points).
    """
    # Clean and limit payload to conserve tokens
    clean_resume = " ".join(req.resume_text.split())[:8000]
    
    cache_key = (req.target_role.strip().lower(), clean_resume)
    if cache_key in linkedin_optimizer_cache:
        print("Serving LinkedIn optimization from cache!")
        async def cached_generator():
            for chunk in linkedin_optimizer_cache[cache_key]:
                yield chunk
        return StreamingResponse(
            cached_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )

    prompt = f"Optimize a LinkedIn profile for target role: {req.target_role} using these resume details:\n{clean_resume}"
    system_instruction = LINKEDIN_OPTIMIZER_PROMPT.format(
        target_role=req.target_role,
        resume_text=clean_resume
    )
    
    accumulated_chunks = []
    async def caching_generator():
        async for chunk in stream_gemini_response(prompt, system_instruction, custom_api_key=x_gemini_api_key):
            accumulated_chunks.append(chunk)
            yield chunk
        linkedin_optimizer_cache[cache_key] = accumulated_chunks

    return StreamingResponse(
        caching_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@router.post("/project-recommendations")
async def recommend_projects(
    req: ProjectRecommenderRequest,
    x_gemini_api_key: str = Header(None)
):
    """
    Generates 3 unique portfolio project recommendations based on target goals and skills.
    """
    cache_key = (req.current_skills.strip().lower(), req.target_role.strip().lower())
    if cache_key in project_recommender_cache:
        print("Serving project recommendations from cache!")
        async def cached_generator():
            for chunk in project_recommender_cache[cache_key]:
                yield chunk
        return StreamingResponse(
            cached_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )

    prompt = f"Recommend 3 specific portfolio project ideas for the target role: {req.target_role} matching current skills: {req.current_skills}."
    system_instruction = PROJECT_RECOMMENDER_PROMPT.format(
        current_skills=req.current_skills,
        target_role=req.target_role
    )
    
    accumulated_chunks = []
    async def caching_generator():
        async for chunk in stream_gemini_response(prompt, system_instruction, custom_api_key=x_gemini_api_key):
            accumulated_chunks.append(chunk)
            yield chunk
        project_recommender_cache[cache_key] = accumulated_chunks

    return StreamingResponse(
        caching_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@router.post("/learning-resources")
async def find_learning_resources(
    req: LearningResourcesRequest,
    x_gemini_api_key: str = Header(None)
):
    """
    Curates a list of top free resources for learning a specific technology or topic.
    """
    cache_key = (req.topic.strip().lower(), req.target_role.strip().lower())
    if cache_key in learning_resources_cache:
        print("Serving learning resources from cache!")
        async def cached_generator():
            for chunk in learning_resources_cache[cache_key]:
                yield chunk
        return StreamingResponse(
            cached_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )

    prompt = f"Suggest free learning resources for learning the topic: {req.topic} relevant to target role: {req.target_role}."
    system_instruction = LEARNING_RESOURCES_PROMPT.format(
        topic=req.topic,
        target_role=req.target_role
    )
    
    accumulated_chunks = []
    async def caching_generator():
        async for chunk in stream_gemini_response(prompt, system_instruction, custom_api_key=x_gemini_api_key):
            accumulated_chunks.append(chunk)
            yield chunk
        learning_resources_cache[cache_key] = accumulated_chunks

    return StreamingResponse(
        caching_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
