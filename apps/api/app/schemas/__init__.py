from app.schemas.auth import OTPRequest, OTPVerify, OfficialLogin, TokenResponse
from app.schemas.issue import (
    DiagnosticCardSchema,
    IssueCreate,
    IssueStatusUpdate,
    IssueResponse,
)
from app.schemas.ward import WardResponse, PublicWardMetricsResponse
from app.schemas.crew import CrewLocationUpdate, CrewResponse, CrewSuggestionResponse
from app.schemas.work_order import (
    WorkOrderCreate,
    WorkOrderStatusUpdate,
    WorkOrderResponse,
)
from app.schemas.status_event import StatusEventResponse

__all__ = [
    "OTPRequest",
    "OTPVerify",
    "OfficialLogin",
    "TokenResponse",
    "DiagnosticCardSchema",
    "IssueCreate",
    "IssueStatusUpdate",
    "IssueResponse",
    "WardResponse",
    "PublicWardMetricsResponse",
    "CrewLocationUpdate",
    "CrewResponse",
    "CrewSuggestionResponse",
    "WorkOrderCreate",
    "WorkOrderStatusUpdate",
    "WorkOrderResponse",
    "StatusEventResponse",
]
