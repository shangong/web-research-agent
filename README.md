# web-research-agent - Gemini Research Agent


An autonomous web research agent built with React, TypeScript, and the Google Gemini API.

This agent performs a multi-step research workflow:
1.  **Brainstorm**: Generates high-value search queries based on your topic.
2.  **Reflect**: Refines and selects the best queries.
3.  **Search & Compile**: Uses Gemini's Grounding with Google Search to gather information and write a report.
4.  **Review**: A generic "Reviewer" agent evaluates the report (1-5 scale).
5.  **Rewrite**: If the score is low, the agent iteratively improves the report based on feedback.

## Prerequisites

-   **Node.js** (v18 or higher)
-   **Google Gemini API Key** (Paid tier required for Google Search Grounding features)
    -   Get your key at [Google AI Studio](https://aistudio.google.com/)

## Installation

1.  **Clone the repository** (if applicable) or download the source files.

2.  **Install dependencies**:
    ```bash
    npm install
    ```
    *If a `package.json` is not present, initialize the project and install the following:*
    ```bash
    npm init -y
    npm install react react-dom @google/genai react-markdown @heroicons/react
    npm install -D vite @vitejs/plugin-react typescript @types/react @types/react-dom
    ```

3.  **Configure Environment Variables**:
    Create a `.env` file in the root directory of the project:
    ```env
    API_KEY=your_actual_api_key_here
    ```

    *Note: Ensure your build tool (e.g., Vite) is configured to expose `process.env.API_KEY`. If using Vite, you may need to add `define: { "process.env": process.env }` to your `vite.config.ts` or use `import.meta.env`.*

## Running the Application

Start the development server:

```bash
npm run dev
```

Open your browser to `http://localhost:5173` (or the port shown in your terminal).

## Architecture

-   **Frontend**: React 19
-   **Styling**: Tailwind CSS (loaded via CDN in `index.html` for simplicity)
-   **AI Logic**: `@google/genai` SDK
-   **Model**: `gemini-3-flash-preview` (Configured in `services/geminiService.ts`)

## Usage

1.  Enter a complex topic in the input field (e.g., "Current state of solid-state batteries").
2.  Click the **Start** button.
3.  Observe the "Agent Terminal" on the left as the agent brainstorms, searches, and compiles data.
4.  Review the final markdown report and citations on the right panel.
