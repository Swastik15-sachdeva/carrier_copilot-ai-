import os
import asyncio
import random
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables from .env
load_dotenv()

# Configure the Gemini SDK if key exists
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

def is_api_configured() -> bool:
    """Checks whether the Gemini API key is configured."""
    return bool(os.getenv("GEMINI_API_KEY"))

async def stream_gemini_response(prompt: str, system_instruction: str = None, custom_api_key: str = None):
    """
    Asynchronously calls Gemini 1.5 Flash and streams the response tokens as SSE data format.
    If GEMINI_API_KEY is not set, falls back to mock streaming responses.
    """
    key = custom_api_key or os.getenv("GEMINI_API_KEY")
    if not key:
        # Fallback to Demo/Mock streaming
        async for chunk in get_mock_stream_response(prompt, system_instruction):
            yield chunk
        return

    model_candidates = [
        'gemini-3.1-flash-lite',
        'gemini-flash-lite-latest',
        'gemini-3.5-flash',
        'gemini-flash-latest',
        'gemini-2.0-flash',
        'gemini-pro-latest'
    ]
    
    try:
        genai.configure(api_key=key)
    except Exception as e:
        yield f"data: [API Configuration Error: {str(e)}. Falling back to Demo/Mock mode...]\n\n"
        async for chunk in get_mock_stream_response(prompt, system_instruction):
            yield chunk
        return

    success = False
    last_error = None
    should_fast_fail = False
    max_retries = 3
    base_delay = 1.0

    for model_name in model_candidates:
        if should_fast_fail:
            break
            
        model_success = False
        for attempt in range(max_retries):
            try:
                model = genai.GenerativeModel(
                    model_name=model_name,
                    system_instruction=system_instruction
                )
                response = await model.generate_content_async(prompt, stream=True)
                response_iter = response.__aiter__()
                
                # Verify the model starts streaming successfully
                try:
                    first_chunk = await response_iter.__anext__()
                    success = True
                    model_success = True
                    if first_chunk.text:
                        yield f"data: {first_chunk.text}\n\n"
                except StopAsyncIteration:
                    success = True
                    model_success = True
                    break

                if model_success:
                    try:
                        while True:
                            chunk = await response_iter.__anext__()
                            if chunk.text:
                                yield f"data: {chunk.text}\n\n"
                    except StopAsyncIteration:
                        pass
                    break
            except Exception as e:
                last_error = e
                status_code = getattr(e, 'code', None)
                err_msg = str(e).lower()
                
                # 1. Global authentication or API key errors: fast-fail the entire candidates loop
                if status_code == 401 or "api key not valid" in err_msg or "invalid api key" in err_msg or "unauthorized" in err_msg:
                    print(f"Global auth/key error. Fast failing all candidate models: {e}")
                    should_fast_fail = True
                    break
                
                # 2. Permanent model-specific errors: skip retries and move to next candidate model immediately
                # - 404 (Not Found / Model not available)
                # - 403 (Access denied / Forbidden for this model)
                # - 429 with limit 0 (No quota for this model)
                if (status_code in [403, 404] or 
                    "not found" in err_msg or 
                    "not supported" in err_msg or
                    "limit: 0" in err_msg or 
                    "limit:0" in err_msg or
                    "no longer available" in err_msg):
                    print(f"Permanent error for model '{model_name}': {e}. Skipping retries and trying next model...")
                    break  # Breaks out of the attempt retry loop for this model
                
                # 3. Standard rate-limit 429 (not limit 0) or transient server errors (500, 503): retry with backoff
                if attempt < max_retries - 1:
                    sleep_time = base_delay * (2 ** attempt) + random.uniform(0, 0.5)
                    print(f"Transient error with model '{model_name}': {e}. Retrying in {sleep_time:.2f}s (Attempt {attempt+1}/{max_retries})...")
                    await asyncio.sleep(sleep_time)
                else:
                    print(f"Failed to use model '{model_name}' after {max_retries} attempts: {e}")
        
        # If successfully streamed for this candidate model, stop candidate loop
        if model_success:
            break

    if not success:
        yield f"data: [Gemini API Error (All models failed): {str(last_error)}. Falling back to Demo/Mock mode...]\n\n"
        async for chunk in get_mock_stream_response(prompt, system_instruction):
            yield chunk


async def get_mock_stream_response(prompt, system_instruction: str = None):
    """
    Generates tailored mock streaming responses depending on the prompt type.
    Provides a premium demo experience when no API Key is configured.
    """
    sys_lower = (system_instruction or "").lower()
    
    if isinstance(prompt, list):
        last_msg = ""
        for msg in reversed(prompt):
            if isinstance(msg, dict) and msg.get("role") == "user":
                parts = msg.get("parts", [])
                if parts and isinstance(parts, list):
                    part = parts[0]
                    if isinstance(part, dict):
                        last_msg = part.get("text", "")
                    else:
                        last_msg = str(part)
                break
        prompt_lower = last_msg.lower()
    else:
        prompt_lower = str(prompt).lower()
    
    # 1. Resume Analyzer
    if "ats_score_estimate" in sys_lower or "resume reviewer" in sys_lower:
        feature_text = """### AI Resume Review & Analysis (Demo Mode)

**Overall Profile Summary**: The profile shows solid foundations in technical concepts but lacks quantified business impact. It indicates a strong match for technical tasks, but needs improvement in structural formatting.

**ATS Compatibility Review**:
* **Contact Information**: Complete. Email and phone number are present.
* **Formatting**: Standard layout is fine, but avoid multi-column structures which confuse older ATS parsers.
* **Sections**: Identified distinct Education, Experience, and Skills sections.

**Key Strengths**:
* Clear outline of projects with technologies used.
* Strong educational credentials from a recognized institution.
* Relevant list of technical tools (e.g., Python, Javascript, HTML/CSS).

**Weaknesses & Areas of Improvement**:
* **Lack of Quantified Achievements**: Use percentages, dollars, or time-saved metrics (e.g., "Optimized database queries, reducing load times by 35%").
* **Passive Language**: Avoid phrases like "Responsible for...". Instead use action verbs like "Spearheaded", "Engineered", or "Implemented".

**Keyword Suggestions**:
* Recommended key skills to add for this role: *REST APIs, Docker, CI/CD, Unit Testing, System Design*.

ATS_SCORE_ESTIMATE: 65
"""
    # 2. Roadmap Generator
    elif "learning roadmap" in sys_lower or "skills" in prompt_lower and "target" in prompt_lower:
        feature_text = """### Personalized Upskilling Roadmap (Demo Mode)

Welcome to your learning journey! Here is your step-by-step phased roadmap.

#### Official Reference Roadmaps from roadmap.sh
For interactive developer paths, check out the official roadmaps on [roadmap.sh](https://roadmap.sh):
- [Frontend Developer Roadmap](https://roadmap.sh/frontend)
- [Backend Developer Roadmap](https://roadmap.sh/backend)
- [React Developer Roadmap](https://roadmap.sh/react)
- [Python Developer Roadmap](https://roadmap.sh/python)

#### Phase 1: Foundations (Month 1-2)
* **Core Topics**: Master the core programming syntax, basic algorithms, data structures, and layout standards (HTML5, modern CSS flexbox/grid).
* **Hands-on Projects**: Create a personal portfolio website and 2-3 utility scripts (e.g. calculator, task organizer).
* **Suggested Resources**: MDN Web Docs, freeCodeCamp, [roadmap.sh JavaScript Guide](https://roadmap.sh/javascript).

#### Phase 2: Core Technologies & APIs (Month 3-4)
* **Core Topics**: Learn Web Frameworks (like FastAPI or React), RESTful architectural principles, database fundamentals (SQL, SQLite), and Git version control.
* **Hands-on Projects**: Develop a full-stack CRUD application with database persistence and user authentication.
* **Suggested Resources**: FastAPI official docs, PostgreSQL tutorials, [roadmap.sh SQL Guide](https://roadmap.sh/sql).

#### Phase 3: Systems & Deployment (Month 5-6)
* **Core Topics**: Containerization (Docker), cloud deployment essentials (AWS/Render), CI/CD pipelines, and writing comprehensive test suites.
* **Hands-on Projects**: Containerize your CRUD application, set up a GitHub Actions workflow, and deploy it to a cloud hosting platform.
* **Suggested Resources**: Docker curriculum, AWS Academy, [roadmap.sh DevOps Roadmap](https://roadmap.sh/devops).
"""
    # 3. Mock Interview
    elif "mock interview" in sys_lower or "recruiter" in sys_lower:
        # Return conversational steps based on user input hints
        if "tell me about yourself" in prompt_lower or "introduce" in prompt_lower:
            feature_text = "That is a solid introduction. I like how you highlighted your key accomplishments. Next question:\n\n**Describe a challenging project you worked on. What was the obstacle and how did you resolve it?**"
        elif "project" in prompt_lower or "obstacle" in prompt_lower or "resolve" in prompt_lower:
            feature_text = "Great work resolving that problem using a structured approach. Let's move on to the next question:\n\n**How do you handle working under tight deadlines or prioritizing conflicting tasks in a team environment?**"
        elif "deadline" in prompt_lower or "priority" in prompt_lower or "team" in prompt_lower:
            feature_text = "Good strategy for handling pressure and prioritization. Let's do the final question:\n\n**Where do you see yourself in 3 years, and how does this role fit into that vision?**"
        else:
            # Welcome prompt or final evaluation
            if "hello" in prompt_lower or "start" in prompt_lower or len(prompt_lower) < 60:
                feature_text = "Welcome to your HR Mock Interview! I am your interviewer today. Let's start with the first question:\n\n**Can you tell me about yourself and why you are interested in this target role?**"
            else:
                feature_text = """That is a clear career plan. 

Let's conclude our mock interview. Here is your final summary review:

**Strengths**:
* Clear articulation of problem-solving techniques.
* Good structure in introducing technical projects.

**Improvements**:
* Try using the STAR method (Situation, Task, Action, Result) more explicitly when describing behavioral situations.
* Focus on specifying your individual contribution rather than just what the 'team' did.

Mock Score: 78/100

The mock interview is complete. Thank you!"""
    # 4. Cover Letter
    else:
        feature_text = """[Your Name]
[Your Address]
[Your Email] | [Your Phone]

[Date]

Hiring Manager
[Company Name]
[Company Address]

Dear Hiring Manager,

I am writing to express my enthusiastic interest in the target position at your company. With a strong foundation in modern software development and hands-on experience designing, developing, and deploying applications, I am confident that I can add substantial value to your engineering team.

In my previous projects, I have engineered robust systems using modern languages and frameworks. For instance, I successfully designed and built a web application that improved user engagement, leveraging clean architectural designs and database optimizations. Furthermore, my experience in containerizing applications and automating workflows aligns directly with your team's operational needs.

I am particularly drawn to your company's mission and commitment to building high-quality, impactful software. I bring a proactive, problem-solving mindset and a dedication to continuous upskilling.

Thank you for your time and consideration. I welcome the opportunity to discuss how my technical skills and collaborative background can contribute to your goals.

Sincerely,

[Your Name]
"""

    # Yield words incrementally to simulate active text streaming
    words = feature_text.split(" ")
    chunk_size = 4
    for i in range(0, len(words), chunk_size):
        chunk = " ".join(words[i:i+chunk_size]) + " "
        yield f"data: {chunk}\n\n"
        await asyncio.sleep(0.05)
