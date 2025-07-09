# Robot Building Chat Agent

A React-based web chat agent application built with Next.js and TypeScript, designed to answer technical questions about building robots using OpenAI's GPT-4 with document processing and vector search capabilities.

## Features

- **AI-Powered Chat**: Uses OpenAI's GPT-4 to answer technical questions about robot building
- **Voice Interaction**: Speech-to-text input and text-to-speech responses using OpenAI's Whisper and TTS
- **Voice Mode**: Toggle continuous voice conversation mode with stop speaking controls
- **Document Upload**: Upload PDF, TXT, DOC, and DOCX files to enhance the AI's knowledge base
- **YouTube Integration**: Extract and process YouTube video transcripts with enhanced metadata using YouTube Data API v3
- **🎬 Channel Batch Processing**: Process entire YouTube channels in one operation with Whisper AI transcription for universal coverage
- **🤖 Whisper AI Transcription**: Professional AI transcription that works on ANY YouTube video using OpenAI Whisper
- **Vector Search**: Semantic search through uploaded documents and video transcripts
- **Admin Interface**: Secure admin panel for managing vector search sources and documents
- **Authentication**: Login-protected admin dashboard with document management
- **Responsive Design**: Modern, mobile-friendly interface built with Tailwind CSS
- **Real-time Chat**: Interactive chat interface with persistent message history
- **🧠 Context-Aware Conversations**: AI remembers recent conversation history for more natural responses
- **💾 Persistent Chat History**: Chat conversations are saved locally and persist across browser sessions
- **🔄 Chat Management**: Clear chat history and reset conversations with built-in controls
- **🎯 Enhanced TTS Controls**: Stop speaking functionality to cancel ongoing text-to-speech responses

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

**Required Environment Variables:**
- `OPENAI_API_KEY` - Required for all AI features (chat, voice, Whisper transcription)
- `YOUTUBE_API_KEY` - Required for enhanced YouTube channel processing and metadata extraction
- `NEXTAUTH_SECRET` - Required for admin authentication
- `ADMIN_EMAIL` & `ADMIN_PASSWORD` - Required for admin dashboard access

**Optional Configuration:**
- `NEXT_PUBLIC_APP_URL` - For production deployment (defaults to localhost:3000)
- `NEXTAUTH_URL` - For production authentication (defaults to localhost:3000)

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Basic Chat
- Simply type your robot building questions in the chat interface
- The AI will provide detailed, technical answers about hardware, software, and assembly
- **🧠 Context-Aware Responses**: The AI remembers your recent conversation history for more natural, contextual responses
- **💾 Persistent Chat History**: Your conversations are automatically saved to your browser's local storage and persist across sessions
- **🔄 Chat Management**: Use the "Clear Chat" button to reset the conversation and start fresh
- **📊 Storage Status**: The chat header shows your current storage usage and status

### Voice Interaction
- Click the microphone button (🎤) to record your question
- The AI will transcribe your speech and provide both text and audio responses
- Toggle "Voice Mode" in the header for continuous voice conversations
- **🛑 Stop Speaking**: Click the "Stop Speaking" button to cancel ongoing text-to-speech responses
- Supports OpenAI's Whisper for speech-to-text and TTS for audio responses
- **Context-Aware Voice**: Voice responses include conversation history for better context

### Document Upload
- Click the upload button (📎) to upload relevant documents
- Supported formats: PDF, TXT, DOC, DOCX
- The AI will use document content to enhance its responses

### YouTube Integration

**Professional YouTube Integration with Four Options:**

1. **🎬 Channel Batch Processing with Whisper AI** ⭐ **Primary Feature - Highly Recommended**
   - Process entire YouTube channels in one operation
   - Automatically fetch all videos using YouTube Data API v3
   - Extract transcripts using OpenAI Whisper AI for maximum reliability
   - Works on ANY video with audio content (no caption dependency)
   - Batch processing with progress tracking and error handling
   - Skip videos already in your knowledge base
   - Perfect for educational channels, tutorial series, and technical content creators
   - ✅ **Universal Coverage**: Processes videos regardless of caption availability

2. **🤖 Whisper AI Transcription** ⭐ **Primary Feature - Works on ANY Video**
   - Uses OpenAI's Whisper AI for professional-grade transcription
   - Works on videos with or without existing captions
   - Downloads audio and transcribes using state-of-the-art AI
   - Perfect accuracy for technical content and multiple languages
   - Handles any video that has audio content
   - No dependency on YouTube's caption availability

3. **Enhanced Single Video Processing with YouTube Data API v3** ⭐ **Recommended**
   - Professional-grade video metadata extraction
   - Rich context: title, views, likes, channel info, duration
   - Better transcript extraction reliability
   - Enhanced error handling and troubleshooting
   - Simply add your YouTube Data API key in the admin dashboard

4. **Manual Transcript Upload** (Always Works)
   - Upload transcripts directly for any video
   - Most reliable method for all content types
   - Perfect fallback when automatic extraction fails

**Easy YouTube Data API Setup:**
1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project and enable YouTube Data API v3
3. Generate an API key in the Credentials section
4. Enter your API key in the admin dashboard
5. Enjoy enhanced video processing with rich metadata!

**Channel Processing Features:**
- **Batch Video Discovery**: Automatically finds all videos in a channel
- **Smart Filtering**: Option to skip videos already in your knowledge base
- **Progress Tracking**: Detailed processing results with success/failure counts
- **Metadata Enrichment**: Title, description, views, likes, duration for each video
- **Error Resilience**: Continues processing even if some videos fail
- **Configurable Limits**: Process up to 200 videos per batch (recommended: 25-50)
- **Universal Transcription**: Uses OpenAI Whisper AI for professional-grade transcription
- **No Caption Dependency**: Works on any video with audio content

**� Enhanced Batch Processing Benefits:**
- **100% Coverage**: No videos are skipped due to missing captions
- **Professional Quality**: OpenAI Whisper provides superior transcription accuracy
- **Multi-language Support**: Automatic language detection and transcription
- **Technical Content Optimized**: Perfect accuracy for robot building tutorials and technical discussions

**Smart Processing Features:**
- Semantic chunking optimized for technical content
- Context-aware segmentation for better search results
- Automatic metadata enrichment with video statistics
- Source citations with direct links to video timestamps

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
- **🧠 Conversation Context**: The AI remembers recent messages for more natural, contextual responses
- **💾 Persistent History**: Chat conversations are automatically saved and restored across browser sessions

**Source Display:**
- Sources appear below each AI response that uses contextual information
- Click on document names to download the original files
- Click on YouTube titles to open the video in a new tab
- Sources are automatically tracked and linked without manual input
- **Context Integration**: Source information is enhanced with conversation history for better relevance

## Enhanced Chat Features

### Message History and Context
- **🧠 Context-Aware Conversations**: The AI remembers your recent conversation history, providing more natural and relevant responses
- **💾 Persistent Chat History**: All conversations are automatically saved to your browser's localStorage and persist across sessions
- **📊 Storage Status**: Real-time storage usage indicator in the chat header
- **🔄 Chat Management**: Clear chat history and reset conversations with the "Clear Chat" button
- **🎯 Smart Context**: Recent messages are automatically included in AI requests for better understanding

### Voice and TTS Controls
- **🛑 Stop Speaking**: Cancel ongoing text-to-speech responses with a dedicated stop button
- **🎤 Voice Mode**: Toggle continuous voice conversation mode for hands-free interaction
- **🔊 Enhanced TTS**: High-quality OpenAI text-to-speech with full playback controls
- **🎙️ Universal Speech Recognition**: OpenAI Whisper for accurate speech-to-text in any language

### User Interface Improvements
- **Streamlined Design**: YouTube button removed from chat interface for cleaner experience
- **Professional Focus**: Dedicated admin tools for advanced YouTube channel processing
- **Responsive Controls**: All chat features optimized for desktop and mobile use
- **Status Indicators**: Clear visual feedback for storage, processing, and voice states

## Architecture

### Frontend
- **Next.js 15** with App Router
- **React** with TypeScript
- **Tailwind CSS** for styling
- **Lucide React** for icons

### Backend
- **Next.js API Routes** for server-side functionality
- **OpenAI GPT-4** for AI responses and embeddings
- **YouTube Data API v3** for enhanced video processing
- **Vector Search** for semantic document retrieval
- **NextAuth** for secure authentication

### Key Components
- `ChatInterface.tsx` - Main chat UI component with persistent history and TTS controls
- `vectorSearch.ts` - Vector search and embedding utilities
- `/api/chat-enhanced` - AI chat with context awareness and message history
- `/api/voice-chat` - Voice interaction with conversation context
- `/api/youtube-enhanced` - Professional YouTube integration
- `/api/youtube-channel` - Batch channel processing with YouTube Data API v3 and Whisper AI
- `/api/youtube-whisper` - AI transcription using OpenAI Whisper for universal video processing

## Technologies Used

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety and better development experience
- **Tailwind CSS** - Modern utility-first styling
- **OpenAI GPT-4** - Advanced AI responses and embeddings
- **YouTube Data API v3** - Professional video metadata extraction
- **Vector Embeddings** - Semantic search and similarity matching
- **NextAuth** - Secure authentication system

## Recent Updates & Key Improvements

### 🆕 Latest Features (Current Version)
- **🎬 Universal YouTube Processing**: Complete migration to OpenAI Whisper AI for 100% video coverage
- **🧠 Context-Aware Chat**: AI remembers conversation history for more natural responses
- **💾 Persistent Chat History**: Conversations automatically saved to browser localStorage
- **🛑 Enhanced TTS Controls**: Stop speaking functionality and improved voice interaction
- **🎯 Streamlined UI**: Removed YouTube button from chat interface for professional focus
- **📊 Storage Management**: Real-time storage status and chat management controls

### 🔧 Technical Improvements
- **Whisper AI Integration**: All YouTube processing now uses OpenAI Whisper for universal transcription
- **Message History API**: Chat and voice endpoints enhanced with conversation context
- **LocalStorage Persistence**: Automatic chat history saving and restoration
- **Error Handling**: Improved error handling and recovery for all API endpoints
- **Performance Optimization**: Efficient message history management and storage

### 🎭 User Experience Enhancements
- **Cleaner Interface**: Removed redundant YouTube button from chat interface
- **Professional Focus**: Dedicated admin tools for advanced YouTube channel processing
- **Better Voice Control**: Stop speaking button and enhanced TTS management
- **Context Awareness**: AI responses now consider previous conversation for better relevance
- **Persistent Sessions**: Chat history survives browser restarts and session changes

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For questions about robot building or technical issues, please open an issue in the repository.

## Project Structure

```
chat_me/
├── src/
│   ├── app/                    # Next.js 15 App Router
│   │   ├── api/               # API routes
│   │   │   ├── admin/         # Admin management endpoints
│   │   │   ├── auth/          # NextAuth configuration
│   │   │   ├── chat/          # Basic chat API
│   │   │   ├── chat-enhanced/ # AI chat with context awareness and message history
│   │   │   ├── files/         # File management API
│   │   │   ├── speech-to-text/ # Voice transcription
│   │   │   ├── upload/        # Document upload handler
│   │   │   ├── voice-chat/    # Voice interaction API with conversation context
│   │   │   ├── youtube/       # Basic YouTube processing
│   │   │   ├── youtube-enhanced/ # Professional YouTube with API
│   │   │   ├── youtube-channel/ # Batch channel processing with Whisper AI
│   │   │   ├── youtube-whisper/ # AI transcription with OpenAI Whisper
│   │   │   └── youtube-manual/ # Manual transcript upload
│   │   ├── admin/             # Admin dashboard pages
│   │   └── globals.css        # Global styles
│   ├── components/            # React components
│   │   └── ChatInterface.tsx  # Main chat UI with persistent history and TTS controls
│   ├── utils/                 # Utility functions
│   │   ├── vectorSearch.ts    # Vector search engine
│   │   └── youtubeLoader.ts   # YouTube processing utilities
│   └── types/                 # TypeScript definitions
├── public/                    # Static assets
│   └── audio/                 # TTS audio files
├── uploads/                   # File upload directory
├── .env.local                 # Environment configuration
└── README.md                  # This file
```
