# AI Career Copilot - Personal AI Career Mentor

AI Career Copilot is a personal AI mentor application designed to help job seekers optimize their resumes, practice mock behavioral interviews with live recruiters, generate tailored roadmaps, and build custom cover letters.

This is a full-stack MVP application built for the **Vibe Coding Masterclass Series — Bharat Cares x IBM SkillsBuild**.

---

## Features

1. **AI Resume Score & Analyzer**:
   - Heuristics analysis checking word count, contact details, action verbs, and structure.
   - Real-time streaming AI critique highlighting strengths, weaknesses, and keyword suggestions.
2. **Personalized Career Roadmap**:
   - Formulate target roles and current skill profiles.
   - Streams custom, multi-phase study roadmaps detailing topics, projects, and free resources.
3. **HR Mock Interview Console**:
   - Interactive, step-by-step mock interview simulation with an HR Recruiter persona.
   - Remembers conversation history across turns.
   - Provides final scoring, communication critiques, and summary score cards.
4. **Tailored Cover Letter Builder**:
   - Maps candidate credentials directly to custom job descriptions.
   - Streams an authentic, non-generic, high-converting letter.
   - Instant one-click Copy to Clipboard.

---

## Application Tech Stack

* **Frontend**: HTML5, modern CSS3 (glassmorphic dark design system), and raw ES6 JavaScript. Runs fully client-side and streams tokens chunk-by-chunk.
* **Backend**: Python FastAPI with Uvicorn. Serves both backend API routes and mounts the static frontend.
* **Libraries**:
  - `pypdf` for clean and lightweight PDF text extraction.
  - `google-generativeai` (Gemini SDK) for conversational and structured streaming.
  - `python-dotenv` for local secret management.
* **Containerization**: Single Docker container configurations ready to run locally or deploy to AWS App Runner.

---

## Local Setup & Run

### Prerequisites
* Python 3.9 or higher.
* A Gemini API Key (obtainable for free from [Google AI Studio](https://aistudio.google.com/)).

### Running the Python Backend

1. **Navigate to the backend directory** and create a virtual environment:
   ```bash
   cd backend
   python -m venv venv
   ```

2. **Activate the virtual environment**:
   * On Windows: `venv\Scripts\activate`
   * On macOS/Linux: `source venv/bin/activate`

3. **Install the dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up your environment variables**:
   Create a `.env` file in the `backend/` directory matching `.env.example`:
   ```env
   GEMINI_API_KEY=your_actual_gemini_api_key_here
   ```

5. **Start the FastAPI server**:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

6. Open your browser and navigate to:
   ```
   http://localhost:8000
   ```

---

## Running with Docker

You can package and run the entire application using the provided Dockerfile:

1. Build the image:
   ```bash
   docker build -t career-copilot .
   ```

2. Run the container:
   ```bash
   docker run -d -p 8000:8000 -e GEMINI_API_KEY="your_api_key" career-copilot
   ```

3. View the dashboard at `http://localhost:8000`.
