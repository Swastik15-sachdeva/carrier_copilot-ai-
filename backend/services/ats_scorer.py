"""
ats_scorer.py

This module provides a simple rule-based ATS (Applicant Tracking System)
scoring system.

Responsibilities:
- Evaluate resume completeness.
- Check for common resume sections.
- Calculate an ATS score.
- Return feedback that can be combined with AI analysis.

Note:
This is not a replacement for AI analysis.
Instead, it provides a baseline ATS score before sending
the resume to the LLM.
"""

import re

# ------------------------------------------------------------------
# Common resume sections expected by most ATS systems.
# ------------------------------------------------------------------

REQUIRED_SECTIONS = {
    "Contact Information": [
        "email",
        "phone",
        "contact"
    ],
    "Education": [
        "education"
    ],
    "Experience": [
        "experience",
        "employment",
        "work experience"
    ],
    "Skills": [
        "skills",
        "technical skills"
    ],
    "Projects": [
        "projects"
    ],
}


def calculate_ats_score(resume_text: str) -> dict:
    """
    Calculate a basic ATS score using rule-based checks.

    Parameters
    ----------
    resume_text : str
        Extracted resume text.

    Returns
    -------
    dict
        ATS score and feedback.
    """

    score = 0
    feedback = []

    # Convert to lowercase for case-insensitive matching
    text = resume_text.lower()

    # --------------------------------------------------------------
    # Check for required resume sections
    # --------------------------------------------------------------

    section_score = 15

    for section, keywords in REQUIRED_SECTIONS.items():

        found = any(keyword in text for keyword in keywords)

        if found:
            score += section_score
        else:
            feedback.append(f"Missing or unclear {section} section.")

    # --------------------------------------------------------------
    # Check for an email address
    # --------------------------------------------------------------

    email_pattern = r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"

    if re.search(email_pattern, resume_text):
        score += 10
    else:
        feedback.append("No email address detected.")

    # --------------------------------------------------------------
    # Check for a phone number
    # --------------------------------------------------------------

    phone_pattern = r"\+?\d[\d\s\-]{8,}"

    if re.search(phone_pattern, resume_text):
        score += 10
    else:
        feedback.append("No phone number detected.")

    # --------------------------------------------------------------
    # Resume Length
    # --------------------------------------------------------------

    words = resume_text.split()

    if len(words) >= 250:
        score += 5
    else:
        feedback.append(
            "Resume appears too short. Consider adding more detail."
        )

    # --------------------------------------------------------------
    # Cap score at 100
    # --------------------------------------------------------------

    score = min(score, 100)

    return {
        "ats_score": score,
        "feedback": feedback
    }
