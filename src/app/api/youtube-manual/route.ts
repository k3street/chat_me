import { NextRequest, NextResponse } from 'next/server';
import { addDocument } from '@/utils/vectorSearch';

export async function POST(req: NextRequest) {
  try {
    const { youtubeUrl, transcriptText, videoTitle } = await req.json();

    if (!youtubeUrl || typeof youtubeUrl !== 'string') {
      return NextResponse.json(
        { error: 'YouTube URL is required' },
        { status: 400 }
      );
    }

    if (!transcriptText || typeof transcriptText !== 'string') {
      return NextResponse.json(
        { error: 'Transcript text is required' },
        { status: 400 }
      );
    }

    // Extract video ID from URL
    const videoIdMatch = youtubeUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    if (!videoIdMatch) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL format' },
        { status: 400 }
      );
    }

    const videoId = videoIdMatch[1];
    const title = videoTitle || `YouTube Video: ${videoId}`;

    try {
      // Process transcript into chunks (similar to LangChain approach)
      const chunks = createSemanticChunks(transcriptText);
      
      // Add each chunk to vector search index
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        await addDocument(chunk, {
          source: videoId,
          type: 'youtube',
          title: title,
          url: youtubeUrl,
          chunkIndex: i,
        });
      }

      return NextResponse.json({
        success: true,
        videoId,
        title,
        chunksProcessed: chunks.length,
        totalLength: transcriptText.length,
        message: `Manual YouTube transcript processed into ${chunks.length} chunks and added to knowledge base`,
      });

    } catch (processingError) {
      console.error('Error processing manual transcript:', processingError);
      return NextResponse.json(
        { error: 'Failed to process transcript text' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in manual YouTube API:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

/**
 * Create semantic chunks from transcript text
 */
function createSemanticChunks(text: string): string[] {
  const chunks: string[] = [];
  const maxChunkSize = 1000;
  const overlap = 200;

  // Split by sentences first
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  let currentChunk = '';
  
  for (const sentence of sentences) {
    const sentenceWithSpace = currentChunk ? ` ${sentence.trim()}` : sentence.trim();
    
    if (currentChunk.length + sentenceWithSpace.length > maxChunkSize && currentChunk) {
      // Add current chunk
      chunks.push(currentChunk.trim());
      
      // Start new chunk with overlap
      const overlapText = getOverlapText(currentChunk, overlap);
      currentChunk = overlapText + sentenceWithSpace;
    } else {
      currentChunk += sentenceWithSpace;
    }
  }

  // Add final chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter(chunk => chunk.length > 50);
}

function getOverlapText(text: string, overlapSize: number): string {
  if (text.length <= overlapSize) return text;
  
  const overlap = text.slice(-overlapSize);
  const lastSpaceIndex = overlap.lastIndexOf(' ');
  
  return lastSpaceIndex > 0 ? overlap.slice(lastSpaceIndex + 1) : overlap;
}
