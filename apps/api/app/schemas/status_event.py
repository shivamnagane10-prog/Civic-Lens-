from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class StatusEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    issue_id: str
    old_status: Optional[str] = None
    new_status: str
    actor_id: Optional[str] = None
    actor_role: Optional[str] = None
    comment: Optional[str] = None
    timestamp: datetime
