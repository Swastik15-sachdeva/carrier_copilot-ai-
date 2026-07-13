"""
llm_client.py

This module handles communication with the Large Language Model (LLM).

Responsibilities:
- Load API credentials securely from environment variables.
- Initialize the Groq client.
- Stream AI-generated responses.
- Keep all LLM-related logic in one reusable location.

Every feature router imports this module instead of directly
calling the LLM API.
"""

import os
from dotenv import load_dotenv
from groq import Groq

# Load environment variables from the .env file
load_dotenv()


# Read configuration values

GROQ_API_KEY = os.getenv("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")
MODEL_NAME = os.getenv(
    "MODEL_NAME",
    "llama-3.3-70b-versatile"
)

# Create the Groq client
# The API key remains on the server and is never exposed to the frontend.

client = Groq(api_key=GROQ_API_KEY)


def stream_completion(system_prompt: str, user_prompt: str):
    """
    Generate a streamed response from the LLM.

    Parameters
    ----------
    system_prompt : str
        Defines the AI's role and behavior.

    user_prompt : str
        Contains the user's request.

    Yields
    ------
    str
        Individual text chunks streamed from the model.
    """

    response = client.chat.completions.create(
        model=MODEL_NAME,
        stream=True,
        messages=[
            {
                "role": "system",
                "content": system_prompt,
            },
            {
                "role": "user",
                "content": user_prompt,
            },
        ],
    )

    # Stream each generated token to the caller
    for chunk in response:

        # Skip empty chunks
        if not chunk.choices:
            continue

        delta = chunk.choices[0].delta.content

        if delta:
            yield delta
