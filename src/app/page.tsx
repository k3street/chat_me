import ChatInterface from '@/components/ChatInterface';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Robot Building Chat Agent
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Ask technical questions about building robots and get AI-powered answers
          </p>
        </header>
        
        <main className="max-w-6xl mx-auto">
          <ChatInterface />
        </main>
      </div>
    </div>
  );
}
