# RAG PDF Summarizer

**Upload a PDF. Get a summary. Ask it questions.**

RAG PDF Summarizer is a full-stack app that lets you chat with your documents. Instead of pushing an entire PDF into an LLM, it extracts and chunks the text, embeds it into a vector store, and retrieves only the passages relevant to each question, so answers stay grounded in your document.

![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![Vue](https://img.shields.io/badge/Vue_3-4FC08D?logo=vuedotjs&logoColor=white)
![ChromaDB](https://img.shields.io/badge/ChromaDB-vector_store-orange)
![Groq](https://img.shields.io/badge/Groq-LLM_inference-black)

---

## Features

- **PDF ingestion**: drag-and-drop upload, file validation, text extraction with `pypdf`, and metadata tracking
- **Smart chunking**: overlapping text chunks sized for retrieval quality
- **Semantic search**: embeddings stored in ChromaDB and queried by similarity
- **Grounded Q&A**: retrieved context is assembled into a prompt and answered by a Groq-hosted LLM
- **Summaries**: condensed overviews of long documents without reading every page
- **Chat interface**: conversation history, document management, and a responsive Vue 3 UI

## Tech Stack

| Layer | Technology |
|---|---|
| API | FastAPI, Uvicorn, Pydantic |
| LLM inference | Groq |
| Vector store | ChromaDB |
| PDF parsing | pypdf |
| Frontend | Vue 3, JavaScript, Vite |

## How It Works

```
Vue 3 frontend ──► FastAPI
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
 Document service            LLM service
 extract → chunk → embed         ▲
        │                        │
        ▼                        │
    ChromaDB ──► retrieval ──► context building ──► Groq ──► response
```

**Ingestion**

1. The user uploads a PDF.
2. The backend validates the file and extracts its text with `pypdf`.
3. The text is split into overlapping chunks.
4. Each chunk is embedded and stored in ChromaDB with its metadata.

**Question answering**

1. The question is embedded.
2. ChromaDB returns the most semantically similar chunks.
3. The chunks are assembled into a prompt as context.
4. Groq generates an answer, which is returned to the UI.

**Summarization** follows the same pipeline: extracted content goes to the LLM to produce a concise summary.

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js and npm
- A [Groq API key](https://console.groq.com)

### 1. Clone

```bash
git clone https://github.com/danni-flaire/RAG-PDF-SUMMARIZER.git
cd RAG-PDF-SUMMARIZER
```

### 2. Backend

```bash
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in the project root (see `.env.example` for all options):

```env
GROQ_API_KEY=your_groq_api_key
```

Start the server:

```bash
python -m uvicorn app.main:app --reload
```

- API: http://127.0.0.1:8000
- Interactive docs: http://127.0.0.1:8000/docs

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173.

## Project Structure

```
RAG-PDF-SUMMARIZER/
├── app/
│   ├── api/routes.py            # HTTP endpoints
│   ├── core/config.py           # Settings and environment config
│   ├── models/schemas.py        # Pydantic request/response models
│   ├── services/
│   │   ├── document_service.py  # Upload, extraction, chunking
│   │   ├── embedding_service.py # Embedding generation
│   │   ├── llm_service.py       # Groq client
│   │   └── rag_service.py       # Retrieval and prompt construction
│   └── main.py                  # FastAPI entry point
├── frontend/                    # Vue 3 + Vite app
├── data/                        # Local storage
├── tests/
├── .env.example
├── requirements.txt
└── README.md
```

## Roadmap

- [ ] OCR for scanned PDFs
- [ ] DOCX and TXT support
- [ ] Hybrid search and reranking
- [ ] Multi-document conversations
- [ ] User authentication
- [ ] Background document processing
- [ ] Streaming responses via Server-Sent Events
- [ ] Docker setup
- [ ] RAG evaluation and observability

## What This Project Demonstrates

Retrieval-augmented generation, embeddings and vector search, document ingestion and chunking, prompt and context-window management, LLM integration, REST API design with FastAPI, and frontend/backend integration.

## Author

**Danni Flaire** · [@danni-flaire](https://github.com/danni-flaire)