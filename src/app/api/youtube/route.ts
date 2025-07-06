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
      console.log('Transcript fetched:', transcript?.length || 0, 'items');
      
      // Check if transcript is available
      if (!transcript || transcript.length === 0) {
        return NextResponse.json(
          { 
            error: 'No transcript available for this video. This could be because:\n' +
                   '• The video does not have captions/subtitles\n' +
                   '• The video is private or restricted\n' +
                   '• YouTube has changed their transcript API\n' +
                   '• The video is live or a short\n\n' +
                   'Please try with a different video that has auto-generated or manual captions.',
            videoId,
            suggestions: [
              'Make sure the video has captions enabled',
              'Try educational videos which usually have transcripts',
              'Check if the video is publicly available',
              'Avoid live streams or YouTube Shorts'
            ]
          },
          { status: 400 }
        );
      }

      // Combine all transcript text
      const fullTranscript = transcript.map((item: any) => item.text).join(' ');
      
      // Get video title (basic implementation)
      const videoTitle = `YouTube Video: ${videoId}`;
      
      // Add to vector search index
      await addDocument(fullTranscript, {
        source: videoId,
        type: 'youtube',
        title: videoTitle,
        url: youtubeUrl,
      });

      return NextResponse.json({
        success: true,
        videoId,
        title: videoTitle,
        transcript: fullTranscript,
        transcriptLength: transcript.length,
        message: 'YouTube transcript processed and added to knowledge base',
      });
    } catch (transcriptError) {
      console.error('Error fetching transcript:', transcriptError);
      
      // Provide detailed error information
      const errorMessage = transcriptError instanceof Error ? transcriptError.message : 'Unknown error';
      
      return NextResponse.json(
        { 
          error: 'Failed to fetch transcript from YouTube',
          details: errorMessage,
          videoId,
          troubleshooting: [
            'Verify the video URL is correct',
            'Check if the video has captions available',
            'Ensure the video is publicly accessible',
            'Try with a different video that has auto-generated captions'
          ]
        },
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
