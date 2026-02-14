'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function ChatPage() {
  const params = useParams();
  const projectId = params.id as string;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href={`/projects/${projectId}`} className="text-blue-600 hover:text-blue-800">
                ← Back to Project
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Talk with Your Data
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Coming in Phase 2
            </p>
            <div className="text-left max-w-2xl mx-auto space-y-4 text-gray-600">
              <p className="font-semibold">Planned features:</p>
              <ul className="list-disc list-inside space-y-2">
                <li>Chat interface with RAG (Retrieval Augmented Generation)</li>
                <li>Query your strategy pack and knowledge base</li>
                <li>Get insights from your project data</li>
                <li>Ask questions about competitors, messaging, and content strategy</li>
              </ul>
              <p className="mt-6 text-sm">
                We'll implement vector search ingestion and a conversational interface to help you
                explore your project data interactively.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
