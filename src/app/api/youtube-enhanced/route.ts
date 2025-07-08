import { NextRequest, NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';
import { google } from 'googleapis';
import { addDocument } from '@/utils/vectorSearch';

interface YouTubeVideoDetails {
  title: string;
  description: string;
  channelTitle: string;
  publishedAt: string;
  duration?: string;
  viewCount?: string;
  likeCount?: string;
}

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&\n?#]+)/,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^&\n?#]+)/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^&\n?#]+)/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([^&\n?#]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

async function fetchVideoDetails(videoId: string, apiKey: string): Promise<YouTubeVideoDetails | null> {
  try {
    // Create YouTube client with the provided API key
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

async function fetchTranscript(videoId: string): Promise<string | null> {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    return transcript.map(item => item.text).join(' ');
  } catch (error) {
    console.error('Error fetching transcript:', error);
    return null;
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

    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL' },
        { status: 400 }
      );
    }

    let videoDetails: YouTubeVideoDetails | null = null;
    
    // Try to fetch video details if API key is provided or available in environment
    const youtubeApiKey = apiKey || process.env.YOUTUBE_API_KEY;
    if (youtubeApiKey) {
      videoDetails = await fetchVideoDetails(videoId, youtubeApiKey);
      if (!videoDetails) {
        return NextResponse.json(
          { error: 'Failed to fetch video details. Please check your YouTube API key.' },
          { status: 400 }
        );
      }
    }

    // Fetch transcript
    const transcript = await fetchTranscript(videoId);
    if (!transcript) {
      return NextResponse.json(
        { 
          error: 'Failed to fetch transcript. The video may not have captions available, or captions may be disabled.',
          suggestion: 'Try using the manual transcript upload feature in the admin dashboard.'
        },
        { status: 400 }
      );
    }

    // Create document content with metadata
    let content = '';
    if (videoDetails) {
      content = `Video Title: ${videoDetails.title}\n`;
      content += `Channel: ${videoDetails.channelTitle}\n`;
      content += `Published: ${new Date(videoDetails.publishedAt).toLocaleDateString()}\n`;
      content += `Duration: ${formatDuration(videoDetails.duration)}\n`;
      content += `Views: ${formatNumber(videoDetails.viewCount)}\n`;
      content += `Likes: ${formatNumber(videoDetails.likeCount)}\n`;
      if (videoDetails.description) {
        content += `Description: ${videoDetails.description.substring(0, 500)}...\n`;
      }
      content += `\nTranscript:\n${transcript}`;
    } else {
      // Fallback content without API metadata
      content = `YouTube Video: ${url}\n\nTranscript:\n${transcript}`;
    }

    // Add to vector store
    const documentId = await addDocument(content, {
      type: 'youtube',
      source: url,
      url: url,
      title: videoDetails?.title || `YouTube Video ${videoId}`,
    });

    // Count how many chunks were created by checking document store
    const { totalDocuments } = await import('@/utils/vectorSearch').then(m => ({ totalDocuments: m.getDocumentStore().filter(doc => doc.metadata.source === url).length }));

    return NextResponse.json({
      success: true,
      message: `Successfully processed YouTube video and added ${totalDocuments} chunks to knowledge base`,
      videoDetails: videoDetails ? {
        title: videoDetails.title,
        channel: videoDetails.channelTitle,
        published: new Date(videoDetails.publishedAt).toLocaleDateString(),
        duration: formatDuration(videoDetails.duration),
        views: formatNumber(videoDetails.viewCount),
        likes: formatNumber(videoDetails.likeCount)
      } : null,
      chunks: totalDocuments,
      videoId,
      documentId
    });

  } catch (error) {
    console.error('Error processing YouTube video:', error);
    return NextResponse.json(
      { error: 'Failed to process YouTube video' },
      { status: 500 }
    );
  }
}
