import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { addDocument } from '@/utils/vectorSearch';
import { writeFile, unlink, readFile } from 'fs/promises';
import { join } from 'path';
import ytdl from '@distube/ytdl-core';

interface YouTubeVideoDetails {
  title: string;
  description: string;
  channelTitle: string;
  publishedAt: string;
  duration?: string;
  viewCount?: string;
  likeCount?: string;
  videoId: string;
}

interface WhisperProcessingResult {
  videoId: string;
  title: string;
  channelTitle: string;
  transcriptText: string;
  chunks: number;
  videoDetails: YouTubeVideoDetails;
}

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&\n?#]+)/,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^&\n?#]+)/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

async function getVideoDetails(videoId: string, apiKey: string): Promise<YouTubeVideoDetails | null> {
  try {
    const youtube = google.youtube({ version: 'v3', auth: apiKey });
    
    const response = await youtube.videos.list({
      part: ['snippet', 'statistics', 'contentDetails'],
      id: [videoId]
    });

    if (!response.data.items || response.data.items.length === 0) {
      return null;
    }

    const video = response.data.items[0];
    const snippet = video.snippet;
    const statistics = video.statistics;
    const contentDetails = video.contentDetails;

    return {
      videoId,
      title: snippet?.title || 'Unknown Title',
      description: snippet?.description || '',
      channelTitle: snippet?.channelTitle || 'Unknown Channel',
      publishedAt: snippet?.publishedAt || '',
      duration: contentDetails?.duration || undefined,
      viewCount: statistics?.viewCount || undefined,
      likeCount: statistics?.likeCount || undefined
    };
  } catch (error) {
    console.error('Error fetching video details:', error);
    return null;
  }
}

async function downloadYouTubeAudio(videoUrl: string, videoId: string): Promise<string> {
  const outputPath = join(process.cwd(), 'uploads', `${videoId}_audio.mp4`);
  
  try {
    console.log('Checking video availability...');
    
    // Validate video first
    const info = await ytdl.getInfo(videoUrl);
    const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
    
    if (audioFormats.length === 0) {
      throw new Error('No audio formats available for this video');
    }

    console.log('Downloading audio stream...');
    
    // Download audio stream
    const audioStream = ytdl(videoUrl, { 
      quality: 'highestaudio',
      filter: 'audioonly'
    });

    // Convert stream to buffer
    const chunks: Buffer[] = [];
    
    return new Promise((resolve, reject) => {
      audioStream.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });
      
      audioStream.on('end', async () => {
        try {
          const audioBuffer = Buffer.concat(chunks);
          await writeFile(outputPath, audioBuffer);
          console.log(`Audio saved to: ${outputPath}`);
          resolve(outputPath);
        } catch (error) {
          reject(error);
        }
      });
      
      audioStream.on('error', (error: Error) => {
        console.error('Stream error:', error);
        reject(error);
      });
    });
    
  } catch (error) {
    console.error('Error downloading audio:', error);
    throw new Error(`Failed to download video audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function transcribeWithWhisper(audioPath: string): Promise<string> {
  try {
    console.log('Preparing audio for Whisper API...');
    
    // Create form data
    const formData = new FormData();
    
    // Read the audio file
    const audioBuffer = await readFile(audioPath);
    const audioBlob = new Blob([audioBuffer], { type: 'audio/mp4' });
    
    formData.append('file', audioBlob, 'audio.mp4');
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'text');
    formData.append('language', 'en'); // Optimize for English

    console.log('Calling Whisper API...');
    
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Whisper API error:', error);
      throw new Error(`Whisper API error: ${response.status} - ${error}`);
    }

    const transcription = await response.text();
    console.log('Transcription completed successfully');
    return transcription;
  } catch (error) {
    console.error('Error transcribing with Whisper:', error);
    throw error;
  }
}

function formatDuration(isoDuration?: string): string {
  if (!isoDuration) return 'Unknown';
  
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 'Unknown';
  
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}

function formatNumber(num?: string): string {
  if (!num) return 'Unknown';
  const number = parseInt(num);
  if (number >= 1000000) {
    return `${(number / 1000000).toFixed(1)}M`;
  } else if (number >= 1000) {
    return `${(number / 1000).toFixed(1)}K`;
  }
  return number.toString();
}

export async function POST(request: NextRequest) {
  try {
    const { url, apiKey } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'YouTube URL is required' },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key is required for Whisper transcription' },
        { status: 400 }
      );
    }

    // Extract video ID
    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL format' },
        { status: 400 }
      );
    }

    // Use provided API key or environment variable for YouTube Data API
    const youtubeApiKey = apiKey || process.env.YOUTUBE_API_KEY;
    
    // Get video details (optional - works without YouTube API key)
    let videoDetails: YouTubeVideoDetails | null = null;
    if (youtubeApiKey) {
      videoDetails = await getVideoDetails(videoId, youtubeApiKey);
    }

    console.log(`Processing video: ${videoDetails?.title || videoId}`);

    // Check if video already exists in knowledge base
    const { getDocumentStore } = await import('@/utils/vectorSearch');
    const existingDocs = getDocumentStore().filter(doc => 
      doc.metadata.source.includes(videoId)
    );
    
    if (existingDocs.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Video already processed',
        videoId,
        title: videoDetails?.title || 'Unknown',
        chunks: existingDocs.length,
        alreadyProcessed: true
      });
    }

    // Download audio from YouTube
    console.log('Downloading audio...');
    const audioPath = await downloadYouTubeAudio(url, videoId);

    let transcriptText: string;
    try {
      // Transcribe with Whisper API
      console.log('Transcribing with Whisper...');
      transcriptText = await transcribeWithWhisper(audioPath);
    } finally {
      // Clean up audio file
      try {
        await unlink(audioPath);
      } catch (error) {
        console.warn('Failed to delete audio file:', error);
      }
    }

    if (!transcriptText || transcriptText.trim().length === 0) {
      return NextResponse.json(
        { error: 'No speech detected in video or transcription failed' },
        { status: 400 }
      );
    }

    // Create enhanced content with metadata
    let content = `Video Title: ${videoDetails?.title || 'Unknown'}\n`;
    content += `Channel: ${videoDetails?.channelTitle || 'Unknown'}\n`;
    content += `URL: ${url}\n`;
    
    if (videoDetails) {
      content += `Published: ${new Date(videoDetails.publishedAt).toLocaleDateString()}\n`;
      content += `Duration: ${formatDuration(videoDetails.duration)}\n`;
      content += `Views: ${formatNumber(videoDetails.viewCount)}\n`;
      content += `Likes: ${formatNumber(videoDetails.likeCount)}\n`;
      
      if (videoDetails.description) {
        const shortDescription = videoDetails.description.length > 500 
          ? videoDetails.description.substring(0, 500) + '...' 
          : videoDetails.description;
        content += `Description: ${shortDescription}\n`;
      }
    }
    
    content += `\nTranscript (via Whisper AI):\n${transcriptText}`;

    // Add to vector store
    await addDocument(content, {
      type: 'youtube',
      source: url,
      url: url,
      title: videoDetails?.title || `YouTube Video ${videoId}`,
    });

    // Store additional metadata in a comment for reference
    console.log('Video metadata:', {
      videoId: videoId,
      transcriptionMethod: 'whisper-api',
      channelTitle: videoDetails?.channelTitle,
      publishedAt: videoDetails?.publishedAt,
      duration: videoDetails?.duration,
      viewCount: videoDetails?.viewCount,
      likeCount: videoDetails?.likeCount
    });

    // Count chunks for this video
    const videoChunks = getDocumentStore().filter(doc => 
      doc.metadata.source.includes(videoId)
    ).length;

    const result: WhisperProcessingResult = {
      videoId,
      title: videoDetails?.title || `YouTube Video ${videoId}`,
      channelTitle: videoDetails?.channelTitle || 'Unknown',
      transcriptText,
      chunks: videoChunks,
      videoDetails: videoDetails || {
        videoId,
        title: `YouTube Video ${videoId}`,
        description: '',
        channelTitle: 'Unknown',
        publishedAt: new Date().toISOString()
      }
    };

    return NextResponse.json({
      success: true,
      message: `Successfully transcribed and processed YouTube video using Whisper AI`,
      ...result,
      transcriptLength: transcriptText.length,
      enhancedMetadata: !!videoDetails
    });

  } catch (error) {
    console.error('Error in Whisper YouTube processing:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        error: 'Failed to process YouTube video with Whisper',
        details: errorMessage,
        troubleshooting: [
          'Ensure the video is publicly accessible',
          'Check that yt-dlp is installed on the server',
          'Verify OpenAI API key has Whisper access',
          'Some videos may be too long for processing',
          'Try with shorter videos (under 10 minutes) first'
        ]
      },
      { status: 500 }
    );
  }
}
