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

    # 3. Check for standard & optional sections
    core_sections = {
        "experience": [r"experience", r"employment", r"work history", r"professional background", r"professional experience"],
        "education": [r"education", r"academic", r"degree", r"university", r"college", r"education qualifications"],
        "skills": [r"skills", r"technologies", r"technical strengths", r"expertise", r"core competencies"]
    }
    optional_sections = {
        "projects": [r"projects", r"personal projects", r"key achievements", r"academic projects"],
        "summary": [r"summary", r"objective", r"professional summary", r"about me", r"profile"],
        "certifications": [r"certifications", r"certificates", r"awards", r"honors", r"publications", r"courses"]
    }
    
    sections_found = []
    sections_missing = []
    
    for section_name, patterns in core_sections.items():
        found = False
        for pattern in patterns:
            if re.search(r'\b' + pattern + r'\b', resume_text, re.IGNORECASE):
                found = True
                break
        if found:
            sections_found.append(section_name)
        else:
            sections_missing.append(section_name)
            score -= 10
            deductions.append(f"Missing a core '{section_name.capitalize()}' section.")
            
    for section_name, patterns in optional_sections.items():
        found = False
        for pattern in patterns:
            if re.search(r'\b' + pattern + r'\b', resume_text, re.IGNORECASE):
                found = True
                break
        if found:
            sections_found.append(section_name)
        else:
            sections_missing.append(section_name)
            score -= 5
            deductions.append(f"Missing a recommended '{section_name.capitalize()}' section.")

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

    # 5. Quantifiable Achievements (e.g. percentages, dollars, multipliers)
    quantifiable_matches = re.findall(r'\b\d+%\b|\$\d+(?:,\d+)*(?:[kKmMbB])?|\b\d+x\b', resume_text)
    quantifiable_count = len(quantifiable_matches)
    
    if quantifiable_count == 0:
        score -= 10
        deductions.append("No quantifiable metrics found (e.g., '35%', '$10K', '2x'). Back your achievements with numbers to show impact.")
    elif quantifiable_count < 3:
        score -= 5
        deductions.append("Few quantifiable metrics found. Try to add more data-driven results (like time saved or revenue increased).")

    # 6. Professional profile links (GitHub & LinkedIn)
    github_match = re.search(r'github\.com\/[\w\.-]+', resume_text, re.IGNORECASE)
    linkedin_match = re.search(r'linkedin\.com\/in\/[\w\.-]+', resume_text, re.IGNORECASE)
    
    if not github_match and not linkedin_match:
        score -= 10
        deductions.append("No GitHub or LinkedIn profiles detected. Add links to showcase your professional network and code repository.")
    elif not github_match:
        deductions.append("GitHub profile link not found. It is highly recommended to showcase projects and code repositories.")
    elif not linkedin_match:
        deductions.append("LinkedIn profile link not found. It is recommended to link your professional network profile.")

    # 7. Check for placeholder text / template boilerplate
    placeholder_patterns = [
        (r'\[[a-zA-Z\s_-]+\]|\{[a-zA-Z\s_-]+\}|<[a-zA-Z\s_-]+>', "bracketed placeholder"),
        (r'john\.doe@email\.com|your\.email@email\.com|email@example\.com|username@email\.com', "dummy email"),
        (r'123-456-7890|1234567890|\b000-000-0000\b', "dummy phone number"),
        (r'\blorem\s+ipsum\b', "Lorem Ipsum filler text"),
        (r'\b(?:insert|your)\s+(?:name|email|phone|company|title)\b', "instructional placeholder")
    ]
    placeholders_found = []
    for pattern, desc in placeholder_patterns:
        matches = re.findall(pattern, resume_text, re.IGNORECASE)
        if matches:
            placeholders_found.append(f"{desc} ('{matches[0]}')")
            
    has_placeholders = len(placeholders_found) > 0
    if has_placeholders:
        score -= 15
        deductions.append(f"Template placeholders detected: {', '.join(placeholders_found)}. Replace them with your actual details.")

    # 8. Cliché/Buzzwords Check
    buzzwords_list = [
        "team player", "detail-oriented", "detail oriented", "hard worker", "hardworking", 
        "results-driven", "results driven", "synergy", "self-motivated", "go-getter", 
        "think outside the box", "dynamic", "thought leader", "strategic thinker",
        "detail-oriented professional", "value add", "motivated self-starter"
    ]
    buzzwords_found = []
    buzzword_count = 0
    for bw in buzzwords_list:
        matches = re.findall(r'\b' + re.escape(bw) + r'\b', resume_text, re.IGNORECASE)
        if matches:
            buzzwords_found.append(bw)
            buzzword_count += len(matches)
            
    if buzzword_count > 3:
        score -= 5
        deductions.append(f"High density of cliché buzzwords ({buzzword_count} found: {', '.join(buzzwords_found[:3])}...). Replace with active verbs and impact.")

    # 9. Chronology/Timeline Check
    year_matches = re.findall(r'\b(20\d{2}|19\d{2})\b', resume_text)
    present_matches = re.findall(r'\b(present|current)\b', resume_text, re.IGNORECASE)
    date_count = len(year_matches) + len(present_matches)
    has_dates = date_count > 0
    
    if not has_dates:
        score -= 10
        deductions.append("No dates or years detected (e.g. '2023' or 'Present'). Ensure your experience and education history have clear timelines.")

    # Bound score between 20 and 100
    score = max(20, min(score, 100))
    
    return {
        "score": score,
        "deductions": deductions,
        "word_count": word_count,
        "has_email": bool(email_match),
        "has_phone": bool(phone_match),
        "action_verb_count": verb_count,
        "quantifiable_metrics_count": quantifiable_count,
        "has_github": bool(github_match),
        "has_linkedin": bool(linkedin_match),
        "sections_found": sections_found,
        "sections_missing": sections_missing,
        "has_placeholders": has_placeholders,
        "placeholders_found": placeholders_found,
        "buzzword_count": buzzword_count,
        "buzzwords_found": buzzwords_found,
        "has_dates": has_dates,
        "date_count": date_count
    }
