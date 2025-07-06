import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

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

    const result = await generateText({
      model: openai('gpt-4o-mini'),
      system: `You are a knowledgeable robot building assistant. You specialize in helping people with technical questions about building robots, including:

- Hardware components (sensors, actuators, microcontrollers, etc.)
- Software programming (Arduino, Raspberry Pi, ROS, etc.)
- Mechanical design and 3D printing
- Electronics and circuit design
- Assembly and troubleshooting
- Best practices and safety considerations

Provide clear, practical, and actionable advice. If you're unsure about something, suggest resources or recommend consulting with specialists. Focus on being helpful while prioritizing safety in all recommendations.`,
      prompt: message,
      maxTokens: 1000,
    });

    return NextResponse.json({ response: result.text });
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    );
  }
}
