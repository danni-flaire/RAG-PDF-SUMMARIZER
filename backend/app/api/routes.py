from fastapi import APIRouter
from app.models.schemas import ChatRequest, ChatResponse
from app.services.llm_service import LLMService
from fastapi import HTTPException, UploadFile, File
from app.services.document_service import DocumentService

router = APIRouter()
llm_service = LLMService()
document_service = DocumentService()

@router.post('/chat', response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        reply = await llm_service.generate_text(request.message)
        return ChatResponse(reply=reply)
    except RuntimeError:
         raise HTTPException(
            status_code=502,
            detail="AI service failed to generate a response."
        )


@router.post("/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    if not file.filename or "." not in file.filename:
        raise HTTPException (
            status_code=status.HTTP_400_BAD_REQUEST
        )
    text = document_service.extract_text(file.file, file.filename)
    return {
        "filename": file.filename,
        "extracted_text": text
    }