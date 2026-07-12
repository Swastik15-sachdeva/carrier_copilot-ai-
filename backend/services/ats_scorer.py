import re

def calculate_ats_score(resume_text: str) -> dict:
    """
    Calculate basic rule-based heuristics to give an initial ATS profile.
    Returns a dictionary with details and a base score out of 100.
    """
    score = 100
    deductions = []
    
    # 1. Word Count check
    word_count = len(resume_text.split())
    if word_count < 100:
        score -= 25
        deductions.append("Resume is too short (under 100 words), lacking detailed content.")
    elif word_count < 300:
        score -= 10
        deductions.append("Resume is brief (under 300 words). Add more details to projects and experiences.")
    elif word_count > 1200:
        score -= 10
        deductions.append("Resume is very long (over 1200 words). Aim for concise, impactful descriptions.")

    # 2. Check for contact information
    email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', resume_text)
    # Match standard US formats and simple 10-digit international/Indian numbers
    phone_match = re.search(r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\+?\d{1,3}[-.\s]?\d{9,11}', resume_text)
    
    if not email_match:
        score -= 15
        deductions.append("Email address not found. Ensure contact details are clear.")
    if not phone_match:
        score -= 10
        deductions.append("Phone number not found. Ensure employers can contact you.")

    # 3. Check for standard sections
    sections = {
        "experience": [r"experience", r"employment", r"work history", r"professional background", r"professional experience"],
        "education": [r"education", r"academic", r"degree", r"university", r"college", r"education qualifications"],
        "skills": [r"skills", r"technologies", r"technical strengths", r"expertise", r"core competencies"],
        "projects": [r"projects", r"personal projects", r"key achievements", r"academic projects"]
    }
    
    for section_name, patterns in sections.items():
        found = False
        for pattern in patterns:
            if re.search(r'\b' + pattern + r'\b', resume_text, re.IGNORECASE):
                found = True
                break
        if not found:
            score -= 10
            deductions.append(f"Missing a distinct '{section_name.capitalize()}' section.")

    # 4. Check for action verbs
    action_verbs = ["led", "developed", "managed", "designed", "created", "built", "implemented", "achieved", 
                    "engineered", "optimized", "increased", "solved", "delivered", "coordinated", "collaborated",
                    "facilitated", "supervised", "pioneered", "overhauled"]
    verb_count = 0
    for verb in action_verbs:
        matches = re.findall(r'\b' + verb + r'\b', resume_text, re.IGNORECASE)
        verb_count += len(matches)
        
    if verb_count < 3:
        score -= 10
        deductions.append("Few action verbs found. Use verbs like 'designed', 'optimized', or 'pioneered' to describe tasks.")

    # Bound score between 20 and 100
    score = max(20, min(score, 100))
    
    return {
        "score": score,
        "deductions": deductions,
        "word_count": word_count,
        "has_email": bool(email_match),
        "has_phone": bool(phone_match),
        "action_verb_count": verb_count
    }
