import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { searchSimilarDocuments } from '@/utils/vectorSearch';
import { writeFile } from 'fs/promises';
import path from 'path';

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
        contextText += `\n--- Context ${index + 1} (${doc.metadata.type}) ---\n`;
        contextText += doc.content;
        contextText += '\n';
      });
    }

    // Build conversation history context
    let conversationHistory = '';
    if (messageHistory && Array.isArray(messageHistory) && messageHistory.length > 0) {
      conversationHistory = '\n\nRecent conversation history:\n';
      messageHistory.forEach((msg: { type: string; content: string; timestamp: string }) => {
        // Truncate very long messages to keep context manageable for voice
        const truncatedContent = msg.content.length > 200 
          ? msg.content.substring(0, 200) + '...' 
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

Provide clear, practical, and actionable advice. Keep your responses concise and conversational since this is a voice interaction. If you're unsure about something, suggest resources or recommend consulting with specialists. Focus on being helpful while prioritizing safety in all recommendations.

${contextText ? `Use the provided context to enhance your answer when relevant. If the context contains information that directly relates to the user's question, incorporate it into your response. Always prioritize accuracy and cite when you're using information from the provided context.` : ''}

${conversationHistory ? `Consider the conversation history to provide contextually relevant responses. You can reference previous questions or build upon earlier discussions, but focus primarily on the current message.` : ''}`;

    // Generate text response
    const result = await generateText({
      model: openai('gpt-4o-mini'),
      system: systemPrompt,
      prompt: conversationHistory + message + contextText,
      maxTokens: 500, // Shorter for voice responses
    });

    // Generate speech from the response
    const openaiClient = new OpenAI({
      apiKey: apiKey,
    });

    const speechResponse = await openaiClient.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy', // You can change this to 'echo', 'fable', 'onyx', 'nova', or 'shimmer'
      input: result.text,
      response_format: 'mp3',
    });

    // Save the audio file
    const audioBuffer = Buffer.from(await speechResponse.arrayBuffer());
    const audioFilename = `speech_${Date.now()}.mp3`;
    const audioPath = path.join(process.cwd(), 'public', 'audio', audioFilename);
    
    // Create audio directory if it doesn't exist
    try {
      await writeFile(audioPath, audioBuffer);
    } catch {
      const { mkdir } = await import('fs/promises');
      await mkdir(path.dirname(audioPath), { recursive: true });
      await writeFile(audioPath, audioBuffer);
    }

    return NextResponse.json({
      success: true,
      response: result.text,
      audioUrl: `/audio/${audioFilename}`,
      hasContext: relevantDocs.length > 0,
      contextSources: relevantDocs.map(doc => ({
        type: doc.metadata.type,
        source: doc.metadata.source,
        title: doc.metadata.title
      }))
    });
  } catch (error) {
    console.error('Voice chat error:', error);
    return NextResponse.json(
      { error: 'Failed to generate voice response' },
      { status: 500 }
    );
  }
}
