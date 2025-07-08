import { YoutubeTranscript } from 'youtube-transcript';

export interface YouTubeVideoInfo {
  id: string;
  title: string;
  description?: string;
  duration?: string;
  author?: string;
  url: string;
}

export interface ProcessedTranscript {
  text: string;
  chunks: string[];
  metadata: YouTubeVideoInfo;
  timestamp: number;
}

/**
 * Enhanced YouTube transcript loader inspired by LangChain's approach
 * Handles video metadata extraction and transcript processing
 */
export class YouTubeTranscriptLoader {
  private videoUrl: string;
  private videoId: string;

  constructor(videoUrl: string) {
    this.videoUrl = videoUrl;
    this.videoId = this.extractVideoId(videoUrl);
  }

  private extractVideoId(url: string): string {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    if (!match) {
      throw new Error('Invalid YouTube URL');
    }
    return match[1];
  }

  /**
   * Get basic video information
   */
  private async getVideoInfo(): Promise<YouTubeVideoInfo> {
    // In a production environment, you'd use YouTube's Data API v3
    // For now, we'll return basic info
    return {
      id: this.videoId,
      title: `YouTube Video: ${this.videoId}`,
      url: this.videoUrl,
      author: 'Unknown',
      description: 'Video transcript processed for robot building knowledge base'
    };
  }

  /**
   * Fetch and process transcript
   */
  async load(): Promise<ProcessedTranscript> {
    try {
      // Get video metadata
      const videoInfo = await this.getVideoInfo();

      // Fetch transcript
      const transcript = await YoutubeTranscript.fetchTranscript(this.videoId);

      if (!transcript || transcript.length === 0) {
        throw new Error('No transcript available for this video');
      }

      // Process transcript
      const fullText = transcript.map((item: any) => item.text).join(' ');
      
      // Create semantic chunks (similar to LangChain's text splitters)
      const chunks = this.createSemanticChunks(fullText, transcript);

      return {
        text: fullText,
        chunks,
        metadata: videoInfo,
        timestamp: Date.now()
      };

    } catch (error) {
      throw new Error(`Failed to load YouTube transcript: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create semantic chunks from transcript with timing information
   * Similar to LangChain's RecursiveCharacterTextSplitter
   */
  private createSemanticChunks(fullText: string, transcript: any[]): string[] {
    const chunks: string[] = [];
    const maxChunkSize = 1000;
    const overlap = 200;

    let currentChunk = '';
    let currentSize = 0;

    for (const item of transcript) {
      const text = item.text;
      const textWithSpace = currentChunk ? ` ${text}` : text;

      if (currentSize + textWithSpace.length > maxChunkSize && currentChunk) {
        // Add current chunk
        chunks.push(currentChunk.trim());
        
        // Start new chunk with overlap
        const overlapText = this.getOverlapText(currentChunk, overlap);
        currentChunk = overlapText + textWithSpace;
        currentSize = currentChunk.length;
      } else {
        currentChunk += textWithSpace;
        currentSize += textWithSpace.length;
      }
    }

    // Add final chunk
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks.filter(chunk => chunk.length > 50); // Filter out very small chunks
  }

  /**
   * Get overlap text for chunk continuity
   */
  private getOverlapText(text: string, overlapSize: number): string {
    if (text.length <= overlapSize) return text;
    
    const overlap = text.slice(-overlapSize);
    const lastSpaceIndex = overlap.lastIndexOf(' ');
    
    return lastSpaceIndex > 0 ? overlap.slice(lastSpaceIndex + 1) : overlap;
  }

  /**
   * Validate if a YouTube URL can be processed
   */
  static async canProcess(url: string): Promise<boolean> {
    try {
      const loader = new YouTubeTranscriptLoader(url);
      const videoId = loader.videoId;
      
      // Quick check if transcript might be available
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      return transcript && transcript.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get suggested video types that typically have transcripts
   */
  static getSuggestions(): string[] {
    return [
      'Educational videos (Khan Academy, Coursera, etc.)',
      'Technical tutorials and programming videos',
      'Conference talks and presentations',
      'News videos from major outlets',
      'Popular YouTube creators who enable captions',
      'Videos with auto-generated captions enabled'
    ];
  }
}
