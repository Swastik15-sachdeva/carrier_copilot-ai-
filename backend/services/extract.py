"""
extract.py

This module handles PDF text extraction.

Responsibilities:
- Read uploaded PDF resumes.
- Extract readable text from each page.
- Use pdfplumber as the primary parser.
- Fall back to PyPDF2 if extraction fails.

The extracted text is later passed to the LLM
for resume analysis and ATS scoring.
"""

from io import BytesIO

import pdfplumber
from PyPDF2 import PdfReader


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Extract text from an uploaded PDF file.

    Parameters
    ----------
    file_bytes : bytes
        Binary content of the uploaded PDF.

    Returns
    -------
    str
        Combined text extracted from all pages.

    Raises
    ------
    ValueError
        If no readable text can be extracted.
    """

    extracted_text = ""

    # --------------------------------------------------------------
    # Primary Extraction Method
    # --------------------------------------------------------------
    # pdfplumber performs well on most resumes with structured layouts.
    # --------------------------------------------------------------

    try:

        with pdfplumber.open(BytesIO(file_bytes)) as pdf:

            for page in pdf.pages:

                page_text = page.extract_text()

                if page_text:
                    extracted_text += page_text + "\n"

    except Exception:
        # If pdfplumber fails, we'll try PyPDF2 instead.
        pass

    # --------------------------------------------------------------
    # Fallback Extraction Method
    # --------------------------------------------------------------

    if not extracted_text.strip():

        try:

            reader = PdfReader(BytesIO(file_bytes))

            for page in reader.pages:

                page_text = page.extract_text()

                if page_text:
                    extracted_text += page_text + "\n"

        except Exception:

            raise ValueError(
                "Unable to extract text from the uploaded PDF."
            )

    # --------------------------------------------------------------
    # Validate Extraction
    # --------------------------------------------------------------

    if not extracted_text.strip():

        raise ValueError(
            "The uploaded PDF does not contain readable text."
        )

    return extracted_text.strip()
