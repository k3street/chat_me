'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  FileText, 
  Youtube, 
  Trash2, 
  Search,
  LogOut,
  Database,
  RefreshCw,
  Upload,
  Plus,
  Link
} from 'lucide-react';
import { DocumentChunk } from '@/utils/vectorSearch';

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentChunk[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'document' | 'youtube'>('all');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showYouTubeDialog, setShowYouTubeDialog] = useState(false);
  const [showManualTranscriptDialog, setShowManualTranscriptDialog] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeApiKey, setYoutubeApiKey] = useState('');
  const [manualTranscriptUrl, setManualTranscriptUrl] = useState('');
  const [manualTranscriptText, setManualTranscriptText] = useState('');
  const [manualVideoTitle, setManualVideoTitle] = useState('');
  const [uploadProgress, setUploadProgress] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/admin/login');
      return;
    }

    loadDocuments();
  }, [session, status, router]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/documents');
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const response = await fetch(`/api/admin/documents/${documentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadDocuments();
      } else {
        alert('Error deleting document');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Error deleting document');
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear all documents? This cannot be undone.')) return;

    try {
      const response = await fetch('/api/admin/documents/clear', {
        method: 'POST',
      });

      if (response.ok) {
        await loadDocuments();
      } else {
        alert('Error clearing documents');
      }
    } catch (error) {
      console.error('Error clearing documents:', error);
      alert('Error clearing documents');
    }
  };

  const handleSignOut = async () => {
    const { signOut } = await import('next-auth/react');
    await signOut({ callbackUrl: '/admin/login' });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadProgress(true);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (data.success) {
        await loadDocuments();
        setShowUploadDialog(false);
        alert(`Document "${data.filename}" uploaded successfully!`);
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Error uploading file. Please try again.');
    } finally {
      setUploadProgress(false);
      // Clear the file input
      e.target.value = '';
    }
  };

  const handleYouTubeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeUrl.trim()) return;

    try {
      setUploadProgress(true);
      
      // Use enhanced API if API key is provided, otherwise fallback to basic API
      const endpoint = youtubeApiKey.trim() ? '/api/youtube-enhanced' : '/api/youtube';
      const requestBody = youtubeApiKey.trim() 
        ? { url: youtubeUrl, apiKey: youtubeApiKey }
        : { youtubeUrl };
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      
      if (data.success) {
        await loadDocuments();
        setShowYouTubeDialog(false);
        setYoutubeUrl('');
        
        let successMessage = 'YouTube video transcript processed successfully!';
        if (data.videoDetails) {
          successMessage += `\n\nVideo: ${data.videoDetails.title}`;
          successMessage += `\nChannel: ${data.videoDetails.channel}`;
          successMessage += `\nPublished: ${data.videoDetails.published}`;
          successMessage += `\nDuration: ${data.videoDetails.duration}`;
          successMessage += `\nViews: ${data.videoDetails.views}`;
        }
        successMessage += `\n\nProcessed into ${data.chunks} chunks.`;
        
        alert(successMessage);
      } else {
        const errorMsg = data.error || 'YouTube processing failed';
        const suggestion = data.suggestion ? `\n\nSuggestion: ${data.suggestion}` : '';
        const details = data.details ? `\n\nDetails: ${data.details}` : '';
        const troubleshooting = data.troubleshooting ? 
          `\n\nTroubleshooting:\n${data.troubleshooting.map((tip: string) => `• ${tip}`).join('\n')}` : '';
        
        throw new Error(errorMsg + suggestion + details + troubleshooting);
      }
    } catch (error) {
      console.error('YouTube error:', error);
      alert(`Error processing YouTube video: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploadProgress(false);
    }
  };

  const handleManualTranscriptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTranscriptUrl.trim() || !manualTranscriptText.trim()) return;

    try {
      setUploadProgress(true);
      
      const response = await fetch('/api/youtube-manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          youtubeUrl: manualTranscriptUrl,
          transcriptText: manualTranscriptText,
          videoTitle: manualVideoTitle || undefined
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        await loadDocuments();
        setShowManualTranscriptDialog(false);
        setManualTranscriptUrl('');
        setManualTranscriptText('');
        setManualVideoTitle('');
        alert(`Manual transcript processed successfully into ${data.chunksProcessed} chunks!`);
      } else {
        throw new Error(data.error || 'Manual transcript processing failed');
      }
    } catch (error) {
      console.error('Manual transcript error:', error);
      alert('Error processing manual transcript. Please check your input and try again.');
    } finally {
      setUploadProgress(false);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.metadata.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.metadata.source.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = selectedType === 'all' || doc.metadata.type === selectedType;
    
    return matchesSearch && matchesType;
  });

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Database className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Admin Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Welcome, {session.user?.name}
              </span>
              <button
                onClick={handleSignOut}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Total Documents
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {documents.filter(d => d.metadata.type === 'document').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <Youtube className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  YouTube Videos
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {documents.filter(d => d.metadata.type === 'youtube').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <Database className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Total Chunks
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {documents.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Document Upload Area */}
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                <FileText className="h-12 w-12 text-blue-600 mx-auto mb-3" />
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Upload Documents
                </h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                  Add PDF, TXT, DOC, or DOCX files to the knowledge base
                </p>
                <button
                  onClick={() => setShowUploadDialog(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center mx-auto"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Choose Files
                </button>
              </div>

              {/* YouTube URL Area */}
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-red-400 transition-colors">
                <Youtube className="h-12 w-12 text-red-600 mx-auto mb-3" />
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Auto YouTube
                </h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                  Automatically extract transcripts (may not work for all videos)
                </p>
                <button
                  onClick={() => setShowYouTubeDialog(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center mx-auto"
                >
                  <Link className="h-4 w-4 mr-2" />
                  Try Auto
                </button>
              </div>

              {/* Manual Transcript Area */}
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-green-400 transition-colors">
                <div className="flex items-center justify-center mb-3">
                  <Youtube className="h-8 w-8 text-green-600 mr-2" />
                  <FileText className="h-8 w-8 text-green-600" />
                </div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Manual Transcript
                </h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                  Paste YouTube transcript text manually (recommended)
                </p>
                <button
                  onClick={() => setShowManualTranscriptDialog(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center mx-auto"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Manual
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div className="flex-1 max-w-lg">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search documents..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as 'all' | 'document' | 'youtube')}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">All Types</option>
                  <option value="document">Documents</option>
                  <option value="youtube">YouTube</option>
                </select>

                <button
                  onClick={() => setShowUploadDialog(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Document
                </button>

                <button
                  onClick={() => setShowYouTubeDialog(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
                >
                  <Youtube className="h-4 w-4 mr-2" />
                  Auto YouTube
                </button>

                <button
                  onClick={() => setShowManualTranscriptDialog(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Manual Transcript
                </button>

                <button
                  onClick={loadDocuments}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>

                <button
                  onClick={handleClearAll}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Documents Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Content Preview
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Added
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                      Loading documents...
                    </td>
                  </tr>
                ) : filteredDocuments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                      No documents found
                    </td>
                  </tr>
                ) : (
                  filteredDocuments.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {doc.metadata.type === 'document' ? (
                            <FileText className="h-5 w-5 text-blue-600 mr-2" />
                          ) : (
                            <Youtube className="h-5 w-5 text-red-600 mr-2" />
                          )}
                          <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                            {doc.metadata.type}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {doc.metadata.title || 'Untitled'}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          ID: {doc.metadata.source}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white max-w-xs truncate">
                          {doc.content.substring(0, 100)}...
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {doc.metadata.timestamp ? new Date(doc.metadata.timestamp).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="text-red-600 hover:text-red-900 dark:hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Upload Document Dialog */}
        {showUploadDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Upload Document
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select File
                  </label>
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                      Choose a PDF, TXT, DOC, or DOCX file
                    </p>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={handleFileUpload}
                      disabled={uploadProgress}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className={`cursor-pointer px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-block ${uploadProgress ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {uploadProgress ? 'Uploading...' : 'Choose File'}
                    </label>
                  </div>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowUploadDialog(false)}
                    disabled={uploadProgress}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* YouTube Dialog */}
        {showYouTubeDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Add YouTube Video
              </h3>
              <form onSubmit={handleYouTubeSubmit} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      YouTube Data API Key (Optional)
                    </label>
                    <a 
                      href="https://console.cloud.google.com/apis/credentials" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Get API Key →
                    </a>
                  </div>
                  <input
                    type="password"
                    value={youtubeApiKey}
                    onChange={(e) => setYoutubeApiKey(e.target.value)}
                    placeholder="Your YouTube Data API v3 key"
                    disabled={uploadProgress}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:text-white"
                  />
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 space-y-1">
                    <p>✨ Enhanced features with API key:</p>
                    <ul className="list-disc list-inside ml-2 space-y-0.5">
                      <li>Video title, views, likes, and channel info</li>
                      <li>Better transcript extraction reliability</li>
                      <li>Professional error handling</li>
                    </ul>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    YouTube URL
                  </label>
                  <div className="relative">
                    <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="url"
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      disabled={uploadProgress}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    The video must have captions/subtitles available
                  </p>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                  <p className="text-xs text-yellow-700 dark:text-yellow-300">
                    <strong>Note:</strong> If transcript extraction fails, use the "Manual Transcript" option 
                    or get a YouTube Data API key for better reliability.
                  </p>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowYouTubeDialog(false);
                      setYoutubeUrl('');
                      setYoutubeApiKey('');
                    }}
                    disabled={uploadProgress}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploadProgress || !youtubeUrl.trim()}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {uploadProgress ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Video
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Manual Transcript Dialog */}
        {showManualTranscriptDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Add Manual YouTube Transcript
              </h3>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                  How to get YouTube transcripts manually:
                </h4>
                <ol className="text-xs text-blue-700 dark:text-blue-300 space-y-1 list-decimal list-inside">
                  <li>Go to the YouTube video page</li>
                  <li>Click the "..." (more) button below the video</li>
                  <li>Select "Show transcript"</li>
                  <li>Copy the transcript text and paste it below</li>
                </ol>
              </div>
              <form onSubmit={handleManualTranscriptSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    YouTube URL *
                  </label>
                  <div className="relative">
                    <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="url"
                      value={manualTranscriptUrl}
                      onChange={(e) => setManualTranscriptUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      disabled={uploadProgress}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Video Title (optional)
                  </label>
                  <input
                    type="text"
                    value={manualVideoTitle}
                    onChange={(e) => setManualVideoTitle(e.target.value)}
                    placeholder="Enter a descriptive title for the video"
                    disabled={uploadProgress}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Transcript Text *
                  </label>
                  <textarea
                    value={manualTranscriptText}
                    onChange={(e) => setManualTranscriptText(e.target.value)}
                    placeholder="Paste the YouTube transcript text here..."
                    disabled={uploadProgress}
                    rows={10}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white resize-vertical"
                    required
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {manualTranscriptText.length} characters
                  </p>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowManualTranscriptDialog(false);
                      setManualTranscriptUrl('');
                      setManualTranscriptText('');
                      setManualVideoTitle('');
                    }}
                    disabled={uploadProgress}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploadProgress || !manualTranscriptUrl.trim() || !manualTranscriptText.trim()}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {uploadProgress ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Transcript
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
