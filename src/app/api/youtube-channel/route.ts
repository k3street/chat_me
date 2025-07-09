import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { addDocument } from '@/utils/vectorSearch';
import { writeFile, unlink } from 'fs/promises';
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

interface ChannelProcessingResult {
  channelId: string;
  channelTitle: string;
  totalVideosFound: number;
  videosProcessed: number;
  videosWithTranscripts: number;
  videosFailed: number;
  totalChunks: number;
  processedVideos: Array<{
    videoId: string;
    title: string;
    status: 'success' | 'whisper_failed' | 'error';
    chunks?: number;
    error?: string;
  }>;
}

async function resolveChannelId(identifier: string, apiKey: string): Promise<{ id: string; title: string } | null> {
  try {
    const youtube = google.youtube({ version: 'v3', auth: apiKey });

    // If it's already a channel ID format, try to get channel details
    if (identifier.startsWith('UC') && identifier.length === 24) {
      const response = await youtube.channels.list({
        part: ['snippet'],
        id: [identifier]
      });

      if (response.data.items && response.data.items.length > 0) {
        const channel = response.data.items[0];
        return {
          id: identifier,
          title: channel.snippet?.title || 'Unknown Channel'
        };
      }
    }

    // Try to search for the channel by handle or username
    const searchResponse = await youtube.search.list({
      part: ['snippet'],
      q: identifier,
      type: ['channel'],
      maxResults: 1
    });

    if (searchResponse.data.items && searchResponse.data.items.length > 0) {
      const channel = searchResponse.data.items[0];
      return {
        id: channel.id?.channelId || '',
        title: channel.snippet?.title || 'Unknown Channel'
      };
    }

    return null;
  } catch (error) {
    console.error('Error resolving channel ID:', error);
    return null;
  }
}

async function getChannelVideos(channelId: string, apiKey: string, maxResults: number = 50): Promise<YouTubeVideoDetails[]> {
  try {
    const youtube = google.youtube({ version: 'v3', auth: apiKey });
    const videos: YouTubeVideoDetails[] = [];
    let nextPageToken: string | undefined;

    do {
      // Search for videos from the channel
      const searchResponse = await youtube.search.list({
        part: ['snippet'],
        channelId: channelId,
        type: ['video'],
        order: 'date', // Get newest videos first
        maxResults: Math.min(50, maxResults - videos.length), // API limit is 50 per request
        pageToken: nextPageToken
      });

      if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
        break;
      }

      // Get detailed video information
      const videoIds = searchResponse.data.items
        .map(item => item.id?.videoId)
        .filter(Boolean) as string[];

      if (videoIds.length > 0) {
        const detailsResponse = await youtube.videos.list({
          part: ['snippet', 'statistics', 'contentDetails'],
          id: videoIds
        });

        if (detailsResponse.data.items) {
          for (const video of detailsResponse.data.items) {
            const snippet = video.snippet;
            const statistics = video.statistics;
            const contentDetails = video.contentDetails;

            videos.push({
              videoId: video.id || '',
              title: snippet?.title || 'Unknown Title',
              description: snippet?.description || '',
              channelTitle: snippet?.channelTitle || 'Unknown Channel',
              publishedAt: snippet?.publishedAt || '',
              duration: contentDetails?.duration || undefined,
              viewCount: statistics?.viewCount || undefined,
              likeCount: statistics?.likeCount || undefined
            });
          }
        }
      }

      nextPageToken = searchResponse.data.nextPageToken || undefined;
    } while (nextPageToken && videos.length < maxResults);

    return videos;
  } catch (error) {
    console.error('Error fetching channel videos:', error);
    return [];
  }
}

async function downloadYouTubeAudio(videoUrl: string, videoId: string): Promise<string> {
  const outputPath = join(process.cwd(), 'uploads', `${videoId}_audio.mp4`);
  
  try {
    console.log(`Downloading audio for video ${videoId}...`);
    
    // Validate video first
    const info = await ytdl.getInfo(videoUrl);
    const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
    
    if (audioFormats.length === 0) {
      throw new Error('No audio formats available for this video');
    }

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
          resolve(outputPath);
        } catch (error) {
          reject(error);
        }
      });
      
      audioStream.on('error', (error: Error) => {
        reject(error);
      });
    });
    
  } catch (error) {
    console.error(`Error downloading audio for ${videoId}:`, error);
    throw new Error(`Failed to download video audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function transcribeWithWhisper(audioPath: string): Promise<string> {
  try {
    // Create form data
    const formData = new FormData();
    
    // Read the audio file using dynamic import to avoid require
    const { readFile } = await import('fs/promises');
    const audioBuffer = await readFile(audioPath);
    const audioBlob = new Blob([audioBuffer], { type: 'audio/mp4' });
    
    formData.append('file', audioBlob, 'audio.mp4');
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'text');
    formData.append('language', 'en'); // Optimize for English

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Whisper API error: ${response.status} - ${error}`);
    }

    const transcription = await response.text();
    return transcription;
  } catch (error) {
    console.error('Error transcribing with Whisper:', error);
    throw error;
  }
}

async function fetchTranscript(videoId: string): Promise<string | null> {
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  let audioPath: string | null = null;
  
  try {
    // Download audio from YouTube
    audioPath = await downloadYouTubeAudio(videoUrl, videoId);
    
    // Transcribe with Whisper API
    const transcription = await transcribeWithWhisper(audioPath);
    
    return transcription;
  } catch (error) {
    console.error(`Error fetching transcript for video ${videoId}:`, error);
    return null;
  } finally {
    // Clean up audio file
    if (audioPath) {
      try {
        await unlink(audioPath);
      } catch (error) {
        console.warn(`Failed to delete audio file for ${videoId}:`, error);
      }
    }
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
    const { channelInput, apiKey, maxVideos = 50, skipExisting = true } = await request.json();

    if (!channelInput) {
      return NextResponse.json(
        { error: 'Channel ID, URL, or handle is required' },
        { status: 400 }
      );
    }

    // Validate OpenAI API key for Whisper transcription
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key is required for Whisper transcription' },
        { status: 400 }
      );
    }

    // Use provided API key or environment variable for YouTube
    const youtubeApiKey = apiKey || process.env.YOUTUBE_API_KEY;
    if (!youtubeApiKey) {
      return NextResponse.json(
        { error: 'YouTube Data API key is required for channel processing' },
        { status: 400 }
      );
    }

    // Resolve channel ID from input
    const channelInfo = await resolveChannelId(channelInput, youtubeApiKey);
    if (!channelInfo) {
      return NextResponse.json(
        { error: 'Could not find or access the specified channel' },
        { status: 400 }
      );
    }

    // Get channel videos
    console.log(`Fetching up to ${maxVideos} videos from channel: ${channelInfo.title}`);
    const videos = await getChannelVideos(channelInfo.id, youtubeApiKey, maxVideos);

    if (videos.length === 0) {
      return NextResponse.json(
        { error: 'No videos found for this channel' },
        { status: 400 }
      );
    }

    // Process each video
    const result: ChannelProcessingResult = {
      channelId: channelInfo.id,
      channelTitle: channelInfo.title,
      totalVideosFound: videos.length,
      videosProcessed: 0,
      videosWithTranscripts: 0,
      videosFailed: 0,
      totalChunks: 0,
      processedVideos: []
    };

    for (const video of videos) {
      console.log(`Processing video: ${video.title}`);
      
      try {
        // Check if video already exists if skipExisting is true
        if (skipExisting) {
          const { getDocumentStore } = await import('@/utils/vectorSearch');
          const existingDocs = getDocumentStore().filter(doc => 
            doc.metadata.source.includes(video.videoId)
          );
          
          if (existingDocs.length > 0) {
            console.log(`Skipping ${video.title} - already processed`);
            result.processedVideos.push({
              videoId: video.videoId,
              title: video.title,
              status: 'success',
              chunks: existingDocs.length
            });
            result.videosProcessed++;
            result.videosWithTranscripts++;
            result.totalChunks += existingDocs.length;
            continue;
          }
        }

        // Fetch transcript using Whisper AI
        const transcript = await fetchTranscript(video.videoId);
        
        if (!transcript || transcript.trim().length === 0) {
          result.processedVideos.push({
            videoId: video.videoId,
            title: video.title,
            status: 'whisper_failed',
            error: 'No speech detected or transcription failed'
          });
          result.videosFailed++;
          continue;
        }

        // Create document content with metadata
        let content = `Video Title: ${video.title}\n`;
        content += `Channel: ${video.channelTitle}\n`;
        content += `Published: ${new Date(video.publishedAt).toLocaleDateString()}\n`;
        content += `Duration: ${formatDuration(video.duration)}\n`;
        content += `Views: ${formatNumber(video.viewCount)}\n`;
        content += `Likes: ${formatNumber(video.likeCount)}\n`;
        if (video.description) {
          const shortDescription = video.description.length > 500 
            ? video.description.substring(0, 500) + '...' 
            : video.description;
          content += `Description: ${shortDescription}\n`;
        }
        content += `\nTranscript (via Whisper AI):\n${transcript}`;

        // Add to vector store
        await addDocument(content, {
          type: 'youtube',
          source: `https://www.youtube.com/watch?v=${video.videoId}`,
          url: `https://www.youtube.com/watch?v=${video.videoId}`,
          title: video.title,
        });

        // Count chunks for this video
        const { getDocumentStore } = await import('@/utils/vectorSearch');
        const videoChunks = getDocumentStore().filter(doc => 
          doc.metadata.source.includes(video.videoId)
        ).length;

        result.processedVideos.push({
          videoId: video.videoId,
          title: video.title,
          status: 'success',
          chunks: videoChunks
        });

        result.videosProcessed++;
        result.videosWithTranscripts++;
        result.totalChunks += videoChunks;

        console.log(`✅ Processed: ${video.title} (${videoChunks} chunks)`);

      } catch (error) {
        console.error(`Error processing video ${video.title}:`, error);
        result.processedVideos.push({
          videoId: video.videoId,
          title: video.title,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        result.videosFailed++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${result.videosWithTranscripts} out of ${result.totalVideosFound} videos from channel "${result.channelTitle}" using Whisper AI transcription`,
      result
    });

  } catch (error) {
    console.error('Error in channel processing:', error);
    return NextResponse.json(
      { error: 'Failed to process channel' },
      { status: 500 }
    );
  }
}
