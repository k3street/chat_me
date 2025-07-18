'use client';

import { useState, useEffect } from 'react';
import { Send, Upload, Bot, User, Mic, MicOff, Settings, ExternalLink, FileText, VolumeX } from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  sources?: {
    type: 'document' | 'youtube';
    source: string;
    title?: string;
    url?: string;
    chunkIndex?: number;
  }[];
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Load messages from localStorage on component mount
  useEffect(() => {
    const storedMessages = loadMessagesFromStorage();
    setMessages(storedMessages);
  }, []);

  // Save messages to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      saveMessagesToStorage(messages);
    }
  }, [messages]);

  // Optional: Add a subtle indicator showing when messages are being saved
  const getStorageStatus = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? `💾 ${JSON.parse(stored).length} messages saved` : '';
    } catch {
      return '';
    }
  };

  const stopSpeaking = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
      setIsSpeaking(false);
    }
  };

  const clearChatHistory = () => {
    const defaultMessages = [
      {
        id: '1',
        type: 'bot' as const,
        content: 'Hello! I\'m your Robot Building Assistant. I can help you with technical questions about building robots. You can ask me questions, upload documents, or use voice commands for a more interactive experience.',
        timestamp: new Date(),
      },
    ];
    setMessages(defaultMessages);
    clearMessagesFromStorage();
  };

  // Helper function to prepare message history for API calls
  const prepareMessageHistory = (messages: Message[], maxMessages: number = 8) => {
    // Get the last N messages (excluding the current one being processed)
    // Filter out system messages and focus on conversation flow
    const conversationMessages = messages.filter(msg => 
      !msg.content.includes('📚 *This response was enhanced using context from your uploaded documents/videos.*') &&
      !msg.content.includes('❌ Error') &&
      !msg.content.includes('🎥 YouTube video transcript processed')
    );
    
    const recentMessages = conversationMessages.slice(-maxMessages);
    
    return recentMessages.map(msg => ({
      type: msg.type,
      content: msg.content.replace(/📚 \*This response was enhanced using context from your uploaded documents\/videos\.\*/, '').trim(),
      timestamp: msg.timestamp.toISOString()
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Prepare message history for API
      const messageHistory = prepareMessageHistory(messages);
      
      const response = await fetch('/api/chat-enhanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: input,
          messageHistory: messageHistory 
        }),
      });

      const data = await response.json();
      
      let botContent = data.response || 'I apologize, but I encountered an error processing your request.';
      
      // Add context indicator if relevant documents were found
      if (data.hasContext && data.contextSources?.length > 0) {
        botContent += '\n\n📚 *This response was enhanced using context from your uploaded documents/videos.*';
      }
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: botContent,
        timestamp: new Date(),
        sources: data.contextSources || [],
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsLoading(true);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (data.success) {
        const uploadMessage: Message = {
          id: Date.now().toString(),
          type: 'bot',
          content: `📄 Document "${data.filename}" uploaded successfully! I can now use this information to answer your questions about robot building.`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, uploadMessage]);
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: 'bot',
        content: 'Sorry, there was an error uploading your file. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      // Clear the file input
      e.target.value = '';
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        await processAudioInput(audioBlob);
        
        // Clean up
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: 'bot',
        content: 'Sorry, I couldn\'t access your microphone. Please check your browser permissions.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const processAudioInput = async (audioBlob: Blob) => {
    try {
      setIsLoading(true);
      
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');

      const response = await fetch('/api/speech-to-text', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (data.success && data.text) {
        // Set the transcribed text as input
        setInput(data.text);
        
        // If voice mode is enabled, automatically submit
        if (isVoiceMode) {
          await handleVoiceSubmit(data.text);
        }
      } else {
        throw new Error(data.error || 'Speech recognition failed');
      }
    } catch (error) {
      console.error('Speech processing error:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: 'bot',
        content: 'Sorry, I couldn\'t process your voice input. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceSubmit = async (text: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Prepare message history for API
      const messageHistory = prepareMessageHistory(messages);
      
      const response = await fetch('/api/voice-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: text,
          messageHistory: messageHistory 
        }),
      });

      const data = await response.json();
      
      let botContent = data.response || 'I apologize, but I encountered an error processing your request.';
      
      // Add context indicator if relevant documents were found
      if (data.hasContext && data.contextSources?.length > 0) {
        botContent += '\n\n📚 *This response was enhanced using context from your uploaded documents/videos.*';
      }
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: botContent,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMessage]);

      // Play the audio response if available
      if (data.audioUrl) {
        const audio = new Audio(data.audioUrl);
        setCurrentAudio(audio);
        setIsSpeaking(true);
        
        audio.addEventListener('ended', () => {
          setCurrentAudio(null);
          setIsSpeaking(false);
        });
        
        audio.addEventListener('error', () => {
          setCurrentAudio(null);
          setIsSpeaking(false);
        });
        
        audio.play().catch(console.error);
      }
    } catch (error) {
      console.error('Voice chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleVoiceMode = () => {
    setIsVoiceMode(!isVoiceMode);
  };

  // Helper functions for localStorage management
  const STORAGE_KEY = 'chat-messages';

  const saveMessagesToStorage = (messages: Message[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (error) {
      console.warn('Failed to save messages to localStorage:', error);
    }
  };

  const loadMessagesFromStorage = (): Message[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Convert timestamp strings back to Date objects
      return parsed.map((msg: Message & { timestamp: string }) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
    }
  } catch (error) {
    console.warn('Failed to load messages from localStorage:', error);
  }
    
    // Return default message if no stored messages or error
    return [
      {
        id: '1',
        type: 'bot',
        content: 'Hello! I\'m your Robot Building Assistant. I can help you with technical questions about building robots. You can ask me questions, upload documents, or use voice commands for a more interactive experience.',
        timestamp: new Date(),
      },
    ];
  };

  const clearMessagesFromStorage = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear messages from localStorage:', error);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      {/* Chat Header */}
      <div className="bg-blue-600 dark:bg-blue-800 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot size={24} />
            <div>
              <h2 className="text-xl font-semibold">Robot Building Assistant</h2>
              <p className="text-xs text-blue-200 opacity-75">{getStorageStatus()}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleVoiceMode}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                isVoiceMode 
                  ? 'bg-green-500 text-white' 
                  : 'bg-blue-500 text-white hover:bg-blue-400'
              }`}
              title={isVoiceMode ? 'Voice Mode: ON' : 'Voice Mode: OFF'}
            >
              🎤 {isVoiceMode ? 'Voice ON' : 'Voice OFF'}
            </button>
          <button
            onClick={clearChatHistory}
            className="px-3 py-1 rounded-full text-sm font-medium bg-red-500 text-white hover:bg-red-400 transition-colors"
            title="Clear Chat History"
          >
            🗑️ Clear Chat
          </button>
          <a
            href="/admin/login"
            className="flex items-center px-3 py-1 text-sm font-medium text-white hover:bg-blue-500 rounded-full transition-colors"
            title="Admin Panel"
          >
            <Settings className="h-4 w-4 mr-1" />
            Admin
          </a>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.type === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
              }`}
            >
              <div className="flex items-start gap-2">
                {message.type === 'bot' && <Bot size={20} className="mt-1 flex-shrink-0" />}
                {message.type === 'user' && <User size={20} className="mt-1 flex-shrink-0" />}
                <div className="flex-1">
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  
                  {/* Source Links */}
                  {message.type === 'bot' && message.sources && message.sources.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-600">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Sources:</p>
                      <div className="flex flex-wrap gap-2">
                        {message.sources.map((source, index) => (
                          <div key={index} className="flex items-center gap-1 text-xs">
                            {source.type === 'youtube' ? (
                              <ExternalLink size={12} className="text-red-500" />
                            ) : (
                              <FileText size={12} className="text-blue-500" />
                            )}
                            {source.url ? (
                              <a
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline flex items-center gap-1"
                              >
                                {source.title || source.source}
                                <ExternalLink size={10} />
                              </a>
                            ) : (
                              <span className="text-gray-600 dark:text-gray-400">
                                {source.title || source.source}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Bot size={20} />
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Section */}
      <div className="border-t dark:border-gray-700 p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me about robot building..."
              className="w-full px-4 py-2 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              disabled={isLoading}
            />
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            <label className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer">
              <Upload size={20} />
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            
            {isSpeaking && (
              <button
                type="button"
                onClick={stopSpeaking}
                className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200"
                title="Stop Speaking"
              >
                <VolumeX size={20} />
              </button>
            )}

            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isLoading}
              className={`p-2 transition-colors ${
                isRecording 
                  ? 'text-red-500 hover:text-red-700 animate-pulse' 
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
              title={isRecording ? 'Stop Recording' : 'Start Voice Recording'}
            >
              {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={`p-2 rounded-lg transition-all flex items-center gap-2 ${
                isRecording
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
              }`}
              title={isRecording ? 'Stop Recording' : 'Start Voice Recording'}
            >
              {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
              {isRecording ? 'Stop' : 'Record'}
            </button>
            
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send size={16} />
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
