from fastapi import APIRouter
from app.models.schemas import ChatRequest, ChatResponse
from app.services.llm_service import LLMService
from fastapi import HTTPException, status, UploadFile, File
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
            status_code= 400,
            detail="Invalid file name. Please provide a valid file name."
        )
    allowed_extension = {".pdf"}
    if not any (file.filename.lower().endswith(pdf) for pdf in allowed_extension):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only PDF files are allowed."
        )
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only PDF files are allowed."
        )
    max_file_size = 100 * 1024 ** 2
    file_size = await file.read()
    if len(file_size) > max_file_size:
        raise HTTPException(
            status_code=413,
            detail="File size exceeds the maximum limit of 100MB."
        )
    elif file_size == b"":
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty."
        )
    await file.seek(0)

    text = document_service.extract_text(file.file, file.filename)
    return {
        "filename": file.filename,
        "extracted_text": text
    } 