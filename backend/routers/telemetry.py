from fastapi import APIRouter
from pydantic import BaseModel
from services.storage import SQLiteTelemetryStore

router = APIRouter(prefix="/telemetry", tags=["telemetry"])

class FeedbackRequest(BaseModel):
    telemetry_id: str
    feedback: int  # +1 for positive, -1 for negative

@router.post("/feedback")
async def update_feedback(req: FeedbackRequest):
    """
    Updates the user feedback score for a specific telemetry record.
    """
    await SQLiteTelemetryStore.update_feedback(req.telemetry_id, req.feedback)
    return {"status": "success", "message": "Feedback updated successfully"}
