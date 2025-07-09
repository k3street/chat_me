import { NextRequest, NextResponse } from 'next/server';
import { YouTubeTranscriptLoader } from '@/utils/youtubeLoader';
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

    // Validate URL format
    try {
      new YouTubeTranscriptLoader(youtubeUrl);
    } catch {
      return NextResponse.json(
        { error: 'Invalid YouTube URL format' },
        { status: 400 }
      );
    }

    try {
      // Create loader and process video
      const loader = new YouTubeTranscriptLoader(youtubeUrl);
      console.log('Loading YouTube transcript...');
      
      const result = await loader.load();
      console.log('Transcript loaded:', result.chunks.length, 'chunks');

      // Add each chunk to vector search index with metadata
      for (let i = 0; i < result.chunks.length; i++) {
        const chunk = result.chunks[i];
        await addDocument(chunk, {
          source: result.metadata.id,
          type: 'youtube',
          title: result.metadata.title,
          url: youtubeUrl,
          chunkIndex: i,
        });
      }

      return NextResponse.json({
        success: true,
        videoId: result.metadata.id,
        title: result.metadata.title,
        author: result.metadata.author,
        chunksProcessed: result.chunks.length,
        totalLength: result.text.length,
        message: `YouTube transcript processed into ${result.chunks.length} semantic chunks and added to knowledge base`,
      });

    } catch (processingError) {
      console.error('Error processing YouTube video:', processingError);
      
      const errorMessage = processingError instanceof Error ? processingError.message : 'Unknown error';
      
      return NextResponse.json(
        { 
          error: 'Failed to process YouTube video',
          details: errorMessage,
          suggestions: YouTubeTranscriptLoader.getSuggestions(),
          troubleshooting: [
            'Verify the video has captions or auto-generated subtitles',
            'Check if the video is publicly accessible',
            'Try with educational or tutorial videos',
            'Ensure the video is not a live stream or YouTube Short',
            'Some videos may have transcript access restricted by the creator'
          ]
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in YouTube API:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
