import json
import asyncio
from fastapi import APIRouter, File, UploadFile, Form, Header
from fastapi.responses import StreamingResponse
from services.extract import extract_text_from_pdf
from services.ats_scorer import calculate_ats_score
from services.llm_client import stream_gemini_response
from services.storage import SQLiteCache, generate_cache_key
from prompts import RESUME_ANALYZER_PROMPT

router = APIRouter(prefix="/resume", tags=["resume"])

@router.post("/analyze")
async def analyze_resume(
    target_role: str = Form(...),
    file: UploadFile = File(...),
    x_gemini_api_key: str = Header(None)
):
    """
    Endpoint that extracts text from a PDF resume, computes heuristic scoring,
    and returns a combined SSE stream of heuristics and streaming LLM analysis.
    """
    # 1. Read PDF bytes
    file_bytes = await file.read()
    
    # 2. Extract text (CPU bound, run in threadpool)
    resume_text = await asyncio.to_thread(extract_text_from_pdf, file_bytes)
    if resume_text:
        # Standardize whitespace and limit text length to conserve tokens
        resume_text = " ".join(resume_text.split())
        resume_text = resume_text[:8000]
        
    is_fallback = False
    
    if not resume_text or resume_text.strip() == "":
        is_fallback = True
        resume_text = """JOHN DOE
john.doe@email.com | +1-555-0199

SUMMARY:
Experienced Software Engineer with 3+ years of experience in web development, specializing in building responsive and highly scalable web applications.

EDUCATION:
Bachelor of Science in Computer Science, University of Technology (2018 - 2022)

EXPERIENCE:
Software Engineer at DevCorp (2022 - Present)
- Led design and development of a customer dashboard, improving API response times by 35%.
- Engineered robust, reusable backend APIs using Python, FastAPI, and PostgreSQL.
- Collaborated with product designers to implement clean glassmorphic frontend UI using HTML, CSS, and modern JavaScript.

SKILLS:
Python, JavaScript, HTML5, CSS3, FastAPI, React, SQL, Git, Docker, REST APIs"""

    # Check Cache
    cache_key = generate_cache_key("resume:v2", resume_text, target_role.strip().lower())
    cached = await SQLiteCache.get(cache_key)
    if cached:
        print("Serving resume analysis from cache!")
        async def cached_event_generator():
            for event in cached:
                yield event
        return StreamingResponse(
            cached_event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )

    # Heuristic scoring (run in threadpool)
    heuristics = await asyncio.to_thread(calculate_ats_score, resume_text)

    async def event_generator():
        accumulated_events = []
        if is_fallback:
            msg = "data: [Notice: Could not extract text from the PDF (possibly scanned/empty). Falling back to a sample resume profile for evaluation/preview...]\n\n"
            accumulated_events.append(msg)
            yield msg

        # Stream heuristic results first
        heuristics_data = {
            "type": "heuristics",
            "score": heuristics["score"],
            "deductions": heuristics["deductions"],
            "word_count": heuristics["word_count"],
            "has_email": heuristics["has_email"],
            "has_phone": heuristics["has_phone"],
            "action_verb_count": heuristics["action_verb_count"],
            "quantifiable_metrics_count": heuristics["quantifiable_metrics_count"],
            "has_github": heuristics["has_github"],
            "has_linkedin": heuristics["has_linkedin"],
            "sections_found": heuristics["sections_found"],
            "sections_missing": heuristics["sections_missing"],
            "has_placeholders": heuristics["has_placeholders"],
            "placeholders_found": heuristics["placeholders_found"],
            "buzzword_count": heuristics["buzzword_count"],
            "buzzwords_found": heuristics["buzzwords_found"],
            "has_dates": heuristics["has_dates"],
            "date_count": heuristics["date_count"]
        }
        msg = f"data: {json.dumps(heuristics_data)}\n\n"
        accumulated_events.append(msg)
        yield msg

        # Construct LLM prompt
        prompt = f"Analyze the following resume for the target role: {target_role}\n\nResume Text:\n{resume_text}"
        system_instruction = RESUME_ANALYZER_PROMPT.format(target_role=target_role)

        # Stream LLM response
        async for chunk in stream_gemini_response(prompt, system_instruction, custom_api_key=x_gemini_api_key):
            accumulated_events.append(chunk)
            yield chunk

        # Cache completed sequence
        await SQLiteCache.set(cache_key, accumulated_events)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
from pydantic import BaseModel

class BulletRefineRequest(BaseModel):
    bullet: str
    focus: str
    target_role: str

@router.post("/refine-bullet")
async def refine_bullet(
    req: BulletRefineRequest,
    x_gemini_api_key: str = Header(None)
):
    """
    Improves a single resume bullet point based on a target role and specified focus.
    Streams back the improved result.
    """
    cache_key = generate_cache_key("bullet_refine", req.bullet.strip(), req.focus, req.target_role.strip().lower())
    cached = await SQLiteCache.get(cache_key)
    if cached:
        print("Serving bullet refinement from cache!")
        async def cached_generator():
            for chunk in cached:
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

    system_instruction = (
        "You are an expert resume writer and recruiter.\n"
        "Your task is to rewrite a single resume bullet point to make it extremely strong, professional, and tailored.\n"
        "Do NOT write any introduction or explanation. Only return the refined bullet point itself (starting with a bullet point character like '•' or '-').\n"
        "Ensure the output is clean plain text or simple markdown formatting."
    )

    prompt = (
        f"Target Role: {req.target_role}\n"
        f"Focus Area: {req.focus}\n"
        f"Original Bullet Point: \"{req.bullet}\"\n\n"
        "Improve this bullet point. Follow these guidelines according to the Focus Area:\n"
        "- If Focus Area is 'Metrics', integrate realistic metrics, percentages, dollar amounts, or time saved (even if you have to mock a realistic figure based on the context).\n"
        "- If Focus Area is 'Action', start with strong, impactful action verbs (e.g. Spearheaded, Devised, Orchestrated) instead of weak phrases.\n"
        "- If Focus Area is 'Concise', make the sentence highly impact-dense, removing filler words while keeping the core message strong.\n"
        "- If Focus Area is 'Tailor', match the keywords and technologies commonly expected for the target role.\n\n"
        "Provide exactly ONE refined bullet point."
    )

    accumulated_chunks = []
    async def caching_generator():
        async for chunk in stream_gemini_response(prompt, system_instruction, custom_api_key=x_gemini_api_key):
            accumulated_chunks.append(chunk)
            yield chunk
        await SQLiteCache.set(cache_key, accumulated_chunks)

    return StreamingResponse(
        caching_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
