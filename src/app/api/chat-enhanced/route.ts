import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { searchSimilarDocuments } from '@/utils/vectorSearch';

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

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

    const systemPrompt = `You are a knowledgeable robot building assistant. You specialize in helping people with technical questions about building robots, including:

- Hardware components (sensors, actuators, microcontrollers, etc.)
- Software programming (Arduino, Raspberry Pi, ROS, etc.)
- Mechanical design and 3D printing
- Electronics and circuit design
- Assembly and troubleshooting
- Best practices and safety considerations

Provide clear, practical, and actionable advice. If you're unsure about something, suggest resources or recommend consulting with specialists. Focus on being helpful while prioritizing safety in all recommendations.

${contextText ? `Use the provided context to enhance your answer when relevant. If the context contains information that directly relates to the user's question, incorporate it into your response. Always prioritize accuracy and cite when you're using information from the provided context.` : ''}`;

    const result = await generateText({
      model: openai('gpt-4o-mini'),
      system: systemPrompt,
      prompt: message + contextText,
      maxTokens: 1000,
    });

    return NextResponse.json({ 
      response: result.text,
      hasContext: relevantDocs.length > 0,
      contextSources: relevantDocs.map(doc => ({
        type: doc.metadata.type,
        source: doc.metadata.source,
        title: doc.metadata.title
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
