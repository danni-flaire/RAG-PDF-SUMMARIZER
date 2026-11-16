RAG PDF Summarizer

An AI-powered PDF summarization and question-answering application built with Retrieval-Augmented Generation (RAG).

RAG PDF Summarizer allows users to upload PDF documents, extract their contents, generate intelligent summaries, and ask questions about information contained within their documents.

Instead of sending entire documents directly to an LLM, the application uses document processing, embeddings, vector search, and retrieval pipelines to provide context-aware responses.

Tech Stack

Technology	Purpose
Python	Backend and AI engineering
FastAPI	REST API
Vue 3	Frontend
JavaScript	Frontend logic
Groq	LLM inference
ChromaDB	Vector storage and retrieval
pypdf	PDF text extraction
Pydantic	Data validation
Uvicorn	ASGI server
Vite	Frontend tooling

Features

Document Processing

* PDF document uploads.
* PDF text extraction.
* File validation.
* Document metadata management.
* Intelligent text chunking.
* Document processing pipeline.

AI Engineering

* Retrieval-Augmented Generation (RAG).
* Text embedding generation.
* Semantic similarity search.
* Vector database integration.
* Context-aware LLM responses.
* AI-powered document summarization.
* Document-based question answering.
* Context retrieval and prompt construction.

User Interface

* AI chat interface.
* PDF upload functionality.
* Drag-and-drop document uploads.
* Conversation history.
* Document management.
* Responsive interface.
* Streaming AI responses.

Architecture

             VUE 3 FRONTEND
                    |
                    v
              FASTAPI API
                    |
          +---------+---------+
          |                   |
          v                   v
    DOCUMENT SERVICE      LLM SERVICE
          |                   |
          v                   |
     PDF EXTRACTION            |
          |                   |
          v                   |
      TEXT CHUNKING             |
          |                   |
          v                   |
     EMBEDDING MODEL            |
          |                   |
          v                   |
       CHROMADB                 |
          |                   |
          v                   |
    SEMANTIC RETRIEVAL          |
          |                   |
          +--------+----------+
                   |
                   v
             CONTEXT BUILDING
                   |
                   v
               GROQ LLM
                   |
                   v
             AI RESPONSE
                   |
                   v
              VUE FRONTEND

How It Works

1. Document Ingestion

Users upload PDF documents through the frontend.

The backend:

1. Receives the uploaded document.
2. Validates the file.
3. Extracts text using pypdf.
4. Splits the extracted text into smaller chunks.
5. Generates embeddings.
6. Stores embeddings and metadata in ChromaDB.

2. Retrieval-Augmented Generation

When a user asks a question:

1. The question is converted into an embedding.
2. ChromaDB searches for relevant document chunks.
3. The most relevant information is retrieved.
4. Retrieved context is supplied to the LLM.
5. Groq generates a context-aware response.
6. The response is returned to the frontend.

3. PDF Summarization

The application uses extracted document content and LLM inference to generate summaries, helping users understand lengthy documents without manually reading every page.

Project Structure

RAG-PDF-SUMMARIZER/
│
├── app/
│   ├── api/
│   │   └── routes.py
│   │
│   ├── core/
│   │   └── config.py
│   │
│   ├── models/
│   │   └── schemas.py
│   │
│   ├── services/
│   │   ├── document_service.py
│   │   ├── embedding_service.py
│   │   ├── llm_service.py
│   │   └── rag_service.py
│   │
│   └── main.py
│
├── frontend/
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── vite.config.js
│
├── data/
├── tests/
│
├── .env.example
├── .gitignore
├── requirements.txt
└── README.md

Installation

Prerequisites

* Python 3.11+
* Node.js
* npm
* Groq API key

1. Clone the repository

git clone https://github.com/danni-flaire/RAG-PDF-SUMMARIZER.git
cd RAG-PDF-SUMMARIZER

2. Set up Python

python -m venv .venv
source .venv/bin/activate

3. Install dependencies

pip install -r requirements.txt

4. Configure environment variables

Create a .env file in the project root.

GROQ_API_KEY=your_groq_api_key

Add other configuration variables required by the application.

5. Start the backend

python -m uvicorn app.main:app --reload

Backend:

http://127.0.0.1:8000

API documentation:

http://127.0.0.1:8000/docs

6. Start the frontend

cd frontend
npm install
npm run dev

Frontend:

http://localhost:5173

Engineering Concepts

This project demonstrates practical experience with:

* Retrieval-Augmented Generation.
* Large Language Model integration.
* Embedding models.
* Vector databases.
* Semantic search.
* Document ingestion.
* Text chunking and overlap.
* Prompt engineering.
* Context window management.
* Async Python.
* REST API development.
* Frontend/backend integration.
* AI application architecture.

Future Improvements

* OCR for scanned PDFs.
* DOCX and TXT support.
* Hybrid search.
* Reranking models.
* Advanced retrieval strategies.
* Multi-document conversations.
* User authentication.
* Background document processing.
* Streaming responses using Server-Sent Events.
* Docker containerization.
* RAG evaluation and observability.

Author

Danni Flaire

GitHub: @danni-flaire

⸻

Built with Python, FastAPI, Vue 3, and modern AI engineering techniques.