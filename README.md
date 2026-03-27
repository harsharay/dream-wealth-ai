# WealthPilot — AI-Powered Financial Health Check

WealthPilot is a secure, Neobrutalist-designed financial wellness application that provides "brutally honest" diagnosis of your financial health using Gemini AI.

## 🚀 Architecture Overview

The project is split into two main parts to ensure maximum security for AI API keys:

### 1. Frontend (`/dream-wealth-ai`)
- **Core**: React + Vite + TypeScript
- **Styling**: Tailwind CSS with a custom **Neobrutalism** design system.
- **AI Integration**: Fetches insights from a local proxy server to keep the Gemini API key hidden from the browser.
- **Caching**: Implements `localStorage` caching based on financial data hashes to prevent redundant AI calls.
- **State Management**: React hooks for local form state and metrics calculation.

### 2. Backend Proxy (`/dream-wealth-ai-backend`)
- **Core**: Express.js
- **Security**:
  - Acts as a secure middleman between the frontend and Google Gemini API.
  - Houses the `LLM_KEY` in a server-side `.env` file.
  - Implements **Rate Limiting** (20 requests per 15 minutes) to prevent API abuse.
  - Uses **Dynamic CORS** to only allow requests from the official frontend domains.

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend Framework** | React 18, Vite |
| **Styling** | Tailwind CSS, Lucide Icons |
| **Animation** | Tailwind Keyframes (Shimmer, Pulse, Bounce) |
| **AI Model** | Google Gemini 2.0 Flash |
| **Proxy Server** | Node.js, Express |
| **Database (Planned)** | Supabase (PostgreSQL) |
| **Auth (Planned)** | Supabase Auth |

## 📦 Project Structure

```text
/dream-wealth-ai
├── src/
│   ├── components/       # UI Components (AI Panel, Charts, Form)
│   ├── lib/              # Financial engine and LLM service
│   ├── pages/            # Main Dashboard layout
│   └── types/            # TypeScript definitions for financial data
├── tailwind.config.ts    # Design system and custom animations
└── .env                  # Frontend config (VITE_API_URL, no keys here!)

/dream-wealth-ai-backend
├── server.js             # Express server logic
└── .env                  # Secure LLM_KEY and PORT
```

## 🔒 Security Features

1. **Key Isolation**: The Gemini API key is *never* sent to the frontend. It stays strictly on the backend proxy.
2. **CORS Protection**: The backend only accepts requests from allowed origins (localhost and production domain).
3. **Rate Limiting**: Protects your API quota by limiting the number of requests per IP.
4. **Input Validation**: Frontend guards prevent sending empty or invalid data to the LLM.

## 🛠️ How to Run Locally

1. **Start the Backend**:
   ```bash
   cd dream-wealth-ai-backend
   npm install
   npm start
   ```
2. **Start the Frontend**:
   ```bash
   cd dream-wealth-ai
   npm install
   npm run dev
   ```
