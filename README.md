# Robot Building Chat Agent

A React-based web chat agent application built with Next.js and TypeScript, designed to answer technical questions about building robots using OpenAI's GPT-4 with document processing and vector search capabilities.

## Features

- **AI-Powered Chat**: Uses OpenAI's GPT-4 to answer technical questions about robot building
- **Voice Interaction**: Speech-to-text input and text-to-speech responses using OpenAI's Whisper and TTS
- **Voice Mode**: Toggle continuous voice conversation mode
- **Document Upload**: Upload PDF, TXT, DOC, and DOCX files to enhance the AI's knowledge base
- **YouTube Integration**: Extract and process YouTube video transcripts for additional context
- **Vector Search**: Semantic search through uploaded documents and video transcripts
- **Admin Interface**: Secure admin panel for managing vector search sources and documents
- **Authentication**: Login-protected admin dashboard with document management
- **Responsive Design**: Modern, mobile-friendly interface built with Tailwind CSS
- **Real-time Chat**: Interactive chat interface with message history

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- OpenAI API key

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd chat_me
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory and add your configuration:
```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Next.js Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3003

# Authentication (for admin interface)
NEXTAUTH_URL=http://localhost:3003
NEXTAUTH_SECRET=your-secret-key-here
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your-secure-password-here

# Optional: For enhanced features
YOUTUBE_API_KEY=your_youtube_api_key_here
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Basic Chat
- Simply type your robot building questions in the chat interface
- The AI will provide detailed, technical answers about hardware, software, and assembly

### Voice Interaction
- Click the microphone button (🎤) to record your question
- The AI will transcribe your speech and provide both text and audio responses
- Toggle "Voice Mode" in the header for continuous voice conversations
- Supports OpenAI's Whisper for speech-to-text and TTS for audio responses

### Document Upload
- Click the upload button (📎) to upload relevant documents
- Supported formats: PDF, TXT, DOC, DOCX
- The AI will use document content to enhance its responses

### YouTube Integration
- Click the YouTube button (🎥) to add video transcripts
- Enter a YouTube URL with captions
- The AI will analyze the video content for relevant information

### Admin Interface
- Click "Admin" in the chat header to access the admin panel
- Login with the credentials configured in your `.env.local` file
- View and manage all uploaded documents and YouTube transcripts
- Delete individual documents or clear the entire knowledge base
- Monitor vector search statistics and usage

**Admin Features:**
- **Document Management**: View all uploaded files and their content chunks
- **YouTube Management**: See processed video transcripts and metadata
- **Search & Filter**: Find specific documents by content or source
- **Bulk Operations**: Clear all documents or delete specific items
- **Statistics Dashboard**: Monitor knowledge base size and composition

### Source References & Citations

**Enhanced Context-Aware Responses:**
- When the AI uses information from your uploaded documents or YouTube videos, it will automatically include source references
- Each response shows clickable links to the original sources
- Document links allow you to download the original file
- YouTube links take you directly to the video
- Source indicators show the type of content (📄 Document, 🎥 YouTube)

**Source Display:**
- Sources appear below each AI response that uses contextual information
- Click on document names to download the original files
- Click on YouTube titles to open the video in a new tab
- Sources are automatically tracked and linked without manual input

## Architecture

### Frontend
- **Next.js 15** with App Router
- **React** with TypeScript
- **Tailwind CSS** for styling
- **Lucide React** for icons

### Backend
- **Next.js API Routes** for server-side functionality
- **OpenAI Agents SDK** for AI responses
- **Vector Search** for semantic document retrieval
- **YouTube Transcript API** for video processing

### Key Components
- `ChatInterface.tsx` - Main chat UI component
- `vectorSearch.ts` - Vector search and embedding utilities
- `/api/chat-enhanced` - AI chat with context awareness
- `/api/upload` - Document processing endpoint
- `/api/youtube` - YouTube transcript extraction

## Technologies Used

- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **OpenAI GPT-4** - AI responses
- **Vector Embeddings** - Semantic search
- **YouTube Transcript API** - Video processing

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For questions about robot building or technical issues, please open an issue in the repository.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
