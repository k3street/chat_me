import { NextRequest, NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';
import { addDocument } from '@/utils/vectorSearch';

export async function POST(req: NextRequest) {
  try {
    const { youtubeUrl } = await req.json();

    if (!youtubeUrl || typeof youtubeUrl !== 'string') {
      return NextResponse.json(
        { error: 'YouTube URL is required' },
        { status: 400 }
      );
    }

    // Extract video ID from URL
    const videoIdMatch = youtubeUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    if (!videoIdMatch) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL' },
        { status: 400 }
      );
    }

    const videoId = videoIdMatch[1];

    try {
      // Get transcript
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      
      // Combine all transcript text
      const fullTranscript = transcript.map(item => item.text).join(' ');
      
      // Add to vector search index
      await addDocument(fullTranscript, {
        source: videoId,
        type: 'youtube',
        title: `YouTube Video: ${videoId}`,
      });

      return NextResponse.json({
        success: true,
        videoId,
        transcript: fullTranscript,
        duration: transcript.length,
        message: 'YouTube transcript processed and added to knowledge base',
      });
    } catch (transcriptError) {
      console.error('Error fetching transcript:', transcriptError);
      return NextResponse.json(
        { error: 'Failed to fetch transcript. The video may not have captions available.' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in YouTube API:', error);
    return NextResponse.json(
      { error: 'Failed to process YouTube URL' },
      { status: 500 }
    );
  }
}
