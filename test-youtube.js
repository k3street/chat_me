const { YoutubeTranscript } = require('youtube-transcript');

async function testYouTube() {
  try {
    console.log('Testing YouTube transcript extraction...');
    
    // Test with a video that should have captions
    const videoId = 'kJQP7kiw5Fk'; // This is a well-known educational video
    
    console.log(`Fetching transcript for video: ${videoId}`);
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    
    console.log('Transcript length:', transcript.length);
    console.log('First few items:', transcript.slice(0, 3));
    
    if (transcript.length > 0) {
      console.log('SUCCESS: Transcript fetched successfully');
      console.log('Sample text:', transcript.map(item => item.text).join(' ').substring(0, 200) + '...');
    } else {
      console.log('WARNING: Transcript is empty');
    }
    
  } catch (error) {
    console.error('ERROR:', error);
  }
}

testYouTube();
