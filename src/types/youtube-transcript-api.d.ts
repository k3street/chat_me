declare module 'youtube-transcript-plus' {
  interface TranscriptItem {
    text: string;
    start: number;
    duration: number;
  }

  export class YoutubeTranscript {
    static fetchTranscript(videoId: string): Promise<TranscriptItem[]>;
  }
}
