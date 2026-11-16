from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    message: str

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    reply: str
