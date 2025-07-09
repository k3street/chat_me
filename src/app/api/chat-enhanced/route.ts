import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { searchSimilarDocuments } from '@/utils/vectorSearch';

export async function POST(req: NextRequest) {
  try {
    const { message, messageHistory } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }

    // Search for relevant documents
    const relevantDocs = await searchSimilarDocuments(message, 3);
    
    // Build context from relevant documents
    let contextText = '';
    if (relevantDocs.length > 0) {
      contextText = '\n\nRelevant context from uploaded documents and videos:\n';
      relevantDocs.forEach((doc, index) => {
        contextText += `\n--- Context ${index + 1} (${doc.metadata.type === 'youtube' ? 'YouTube Video' : 'Document'}) ---\n`;
        contextText += `Source: ${doc.metadata.title || doc.metadata.source}\n`;
        if (doc.metadata.url) {
          contextText += `URL: ${doc.metadata.url}\n`;
        }
        contextText += `Content: ${doc.content}\n`;
      });
    }

    // Build conversation history context
    let conversationHistory = '';
    if (messageHistory && Array.isArray(messageHistory) && messageHistory.length > 0) {
      conversationHistory = '\n\nRecent conversation history:\n';
      messageHistory.forEach((msg: { type: string; content: string; timestamp: string }) => {
        // Truncate very long messages to keep context manageable
        const truncatedContent = msg.content.length > 300 
          ? msg.content.substring(0, 300) + '...' 
          : msg.content;
        conversationHistory += `${msg.type === 'user' ? 'User' : 'Assistant'}: ${truncatedContent}\n`;
      });
      conversationHistory += '\nCurrent message:\n';
    }

    const systemPrompt = `You are a knowledgeable robot building assistant. You specialize in helping people with technical questions about building robots, including:

- Hardware components (sensors, actuators, microcontrollers, etc.)
- Software programming (Arduino, Raspberry Pi, ROS, etc.)
- Mechanical design and 3D printing
- Electronics and circuit design
- Assembly and troubleshooting
- Best practices and safety considerations

Provide clear, practical, and actionable advice. If you're unsure about something, suggest resources or recommend consulting with specialists. Focus on being helpful while prioritizing safety in all recommendations.

${contextText ? `Use the provided context to enhance your answer when relevant. If the context contains information that directly relates to the user's question, incorporate it into your response. When you reference information from the context, mention the source (e.g., "According to the document [title]" or "As mentioned in the YouTube video [title]"). Always prioritize accuracy and cite when you're using information from the provided context.` : ''}

${conversationHistory ? `Consider the conversation history to provide contextually relevant responses. You can reference previous questions or build upon earlier discussions, but focus primarily on the current message.` : ''}`;

    const result = await generateText({
      model: openai('gpt-4o-mini'),
      system: systemPrompt,
      prompt: conversationHistory + message + contextText,
      maxTokens: 1000,
    });

    return NextResponse.json({ 
      response: result.text,
      hasContext: relevantDocs.length > 0,
      contextSources: relevantDocs.map(doc => ({
        type: doc.metadata.type,
        source: doc.metadata.source,
        title: doc.metadata.title,
        url: doc.metadata.url,
        chunkIndex: doc.metadata.chunkIndex
      }))
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    );
  }
}
