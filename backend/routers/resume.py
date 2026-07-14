import json
from fastapi import APIRouter, File, UploadFile, Form, Header
from fastapi.responses import StreamingResponse
from services.extract import extract_text_from_pdf
from services.ats_scorer import calculate_ats_score
from services.llm_client import stream_gemini_response
from prompts import RESUME_ANALYZER_PROMPT

router = APIRouter(prefix="/resume", tags=["resume"])

resume_cache = {}

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
    
    # 2. Extract text
    resume_text = extract_text_from_pdf(file_bytes)
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
    cache_key = (hash(resume_text), target_role.strip().lower())
    if cache_key in resume_cache:
        print("Serving resume analysis from cache!")
        async def cached_event_generator():
            for event in resume_cache[cache_key]:
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

    # Heuristic scoring
    heuristics = calculate_ats_score(resume_text)

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
            "action_verb_count": heuristics["action_verb_count"]
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
        resume_cache[cache_key] = accumulated_events

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

