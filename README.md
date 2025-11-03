## ICT Assistant AI Chatbot

An AI-powered assistant for ICT knowledge retrieval and chat (specialized in CSTA - Computer Supported Telecommunications Applications - standards). It combines RAG (embeddings + similarity search + optional rerank) with a chat endpoint using OpenAI models (proxied via Helicone). Based on Vercel AI SDK.

### Features
- **Chat** with contextual retrieval using a tools-enabled model
- **Upload** documents (per page) to build the knowledge base with embeddings
- **Retrieve** relevant chunks for a query (for testing/inspection)
- **PostgreSQL + Drizzle ORM** for data storage


## Requirements
- **Node.js** v18+ (recommended v20+)
- **Package manager**: npm, pnpm, or yarn
- **PostgreSQL** with **pgvector**
- Environment variables:
  - `DATABASE_URL` (Postgres connection string)
  - `OPENAI_API_KEY`
  - `HELICONE_API_KEY` (if using Helicone proxy)


## Installation
1) Install dependencies
```bash
npm install
# or
pnpm install
```

2) Configure environment
Create a `.env` file in the project root with at least:
```bash
DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/DB
OPENAI_API_KEY=your-openai-key
HELICONE_API_KEY=your-helicone-key
```

3) Create a database
Create a new user (optional) and a new empty database in PostgreSQL. 
Set `DATABASE_URL` environment variable properly.

4) Run database migrations
```bash
npm run db:migrate
# or
pnpm db:migrate
```
Database user should have superuser permissions during the process.

## Quick Start
Development server:
```bash
npm run dev
# or
pnpm dev
```

Open the app at `http://localhost:3000`.


## Project Scripts
- **dev**: start Next.js dev server
- **build**: build the app
- **start**: start the production server
- **lint**: run Next.js ESLint
- **db:migrate**: run Drizzle migrations (`lib/db/migrations`)


## Architecture Overview
- `lib/db/schema/resources.ts` defines tables:
  - `resources`: stores raw content
  - `embeddings`: stores embedded chunks with `filename`, `page`, `content`, and `embedding` (1536-dim vector)
- `lib/ai/embedding.ts` handles embedding generation and similarity search (with optional rerank)
- `app/api/upload/route.ts` creates resources and embeddings
- `app/api/retrieve/route.ts` finds relevant chunks for a query
- `app/api/chat/route.ts` streams/generates chat responses; uses a retrieval tool to fetch context
- `lib/ai/client.ts` implements OpenAI via Helicone proxy


## API Reference
Base URL in development: `http://localhost:3000`

### 1) Upload Document
Endpoint: `POST /api/upload`

Purpose: Ingest a single chunk to the knowledge base. Creates a `resources` record and a corresponding `embeddings` record.

Request headers:
- `Content-Type: application/json`

Request body (JSON):
```json
{
  "id": 123,
  "filename": "guide.pdf",
  "page": 5,
  "text": "This is the extracted text for page 5."
}
```
Responses:
- 201 (positive response)
  ```json
  { "message": "document received" }
  ```
- 400 (invalid JSON or schema)
  ```json
  { "error": "Invalid parameters", "details": [ ... ] }
  ```
  or
  ```json
  { "error": "Invalid JSON" }
  ```
- 500 (DB/embedding error)
  ```json
  { "error": "Error creating resource", "details": "...optional..." }
  ```

Example cURL:
```bash
curl -X POST http://localhost:3000/api/upload \
  -H "Content-Type: application/json" \
  -d '{
    "id": 1,
    "filename": "kb.pdf",
    "page": 1,
    "text": "Networking basics..."
  }'
```


### 2) Retrieve Relevant Content (Testing)
Endpoint: `POST /api/retrieve`

Purpose: Test retrieval independently. Returns the most similar chunks, optionally reranked, up to 4 results.

Request headers:
- `Content-Type: application/json`

Request body (JSON):
```json
{ "query": "How to configure VPN?" }
```

Responses:
- 200 (positive response, array of relevant chunks)
  ```json
  [
    {
      "id": "emb_...",
      "content": "...",
      "filename": "guide.pdf",
      "page": 5,
      "similarity": 0.87,
      "originalRank": 1,
      "rerank": 1
    }
  ]
  ```
- 400
  ```json
  { "error": "query should not be empty" }
  ```
  or
  ```json
  { "error": "Invalid JSON", "details": "...optional..." }
  ```
- 404
  ```json
  { "error": "No relevant information found in the knowledge base." }
  ```
- 503
  ```json
  { "error": "Knowledge base is temporarily not available." }
  ```
- 500
  ```json
  { "error": "Error retrieving resource", "details": "...optional..." }
  ```

Example cURL:
```bash
curl -X POST http://localhost:3000/api/retrieve \
  -H "Content-Type: application/json" \
  -d '{ "query": "Resetting VPN credentials" }'
```


### 3) Chat
Endpoint: `POST /api/chat`

Purpose: Generate or stream AI responses. Uses a tool named `getInformation` to pull from the knowledge base when helpful.

Request headers:
- `Content-Type: application/json`
- `Accept`:
  - `application/json` → returns `{ "answer": string }`, for automated testing
  - otherwise streams as Server-Sent Events/UI message stream

Request body (JSON):
```json
{
  "id": "optional-session-id",
  "messages": [
    { "role": "user", "content": "How do I set up VLANs?" }
  ]
}
```

Notes:
- Session is tracked via Helicone headers; if `id` is not provided, a session ID is generated.
- Model: `gpt-5` via `@ai-sdk/openai` and Helicone proxy.
- Tool: `getInformation({ question: string })` calls retrieval and injects concatenated content into the model context.

Responses:
- JSON mode (when `Accept: application/json`):
  ```json
  { "answer": "...text..." }
  ```
- Stream mode: Event stream suitable for UI consumption.

Example cURL (JSON mode):
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "messages": [ { "role": "user", "content": "Explain subnetting basics" } ]
  }'
```


## Usage Workflow
1) Prepare your Postgres database and run migrations
2) Upload your document pages through `POST /api/upload`
3) (testing only) Test retrieval with `POST /api/retrieve`
4) Open the web page at `http://localhost:3000` and ask your questions to begin chat
5) (testing only) call `POST /api/chat` to access chat interface directly


## Troubleshooting
- 500 errors on upload/retrieve: verify `DATABASE_URL` and DB connectivity
- Retrieval returns 404: your KB may be empty or the query is unmatched
- Chat lacks context: ensure uploads were successful and embeddings exist
- OpenAI auth errors: confirm `OPENAI_API_KEY`; for Helicone, confirm `HELICONE_API_KEY`