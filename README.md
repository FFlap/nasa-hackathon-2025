# NASA Research Explorer

A web application for analyzing and visualizing research publications. Upload CSV files containing research data, extract keywords, visualize relationships, and chat with AI about your research.

## Features

- **CSV Analysis** - Upload research publication data and extract keywords automatically
- **Interactive Graph** - Visualize keyword relationships and document distributions
- **AI Chat** - Ask questions about your research data using Gemini AI
- **File Management** - Save and manage multiple analysis sessions

## Tech Stack

- **Framework:** Next.js 15 (App Router, Turbopack)
- **Database:** SQLite with Prisma ORM
- **Authentication:** NextAuth.js
- **AI:** Google Gemini API
- **Styling:** Tailwind CSS
- **Charts:** Recharts, react-force-graph-2d

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd nasa-hackathon-2025
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file with your environment variables:
   ```env
   NEXTAUTH_SECRET=your-secret-key-here
   NEXTAUTH_URL=http://localhost:3000
   GOOGLE_API_KEY=your-gemini-api-key
   ```

4. Set up the database:
   ```bash
   npx prisma migrate dev
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Sign up for an account or log in
2. Click New Analysis in the sidebar
3. Upload a CSV file with research publication data
4. Click Start Analysis to process the data
5. Explore the keyword graph and document distribution
6. Use the AI chat to ask questions about your research