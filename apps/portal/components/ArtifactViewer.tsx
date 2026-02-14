'use client';

import ReactMarkdown from 'react-markdown';

interface Artifact {
  id: string;
  type: string;
  format: string;
  title: string | null;
  content: string | null;
  content_json: any | null;
}

interface ArtifactViewerProps {
  artifact: Artifact;
}

export default function ArtifactViewer({ artifact }: ArtifactViewerProps) {
  if (artifact.format === 'json' && artifact.content_json) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <pre className="overflow-auto text-sm">
          {JSON.stringify(artifact.content_json, null, 2)}
        </pre>
      </div>
    );
  }

  if (artifact.format === 'md' && artifact.content) {
    return (
      <div className="bg-white rounded-lg shadow p-6 prose max-w-none">
        <ReactMarkdown>{artifact.content}</ReactMarkdown>
      </div>
    );
  }

  if (artifact.format === 'txt' && artifact.content) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <pre className="whitespace-pre-wrap text-sm">{artifact.content}</pre>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <p className="text-gray-600">No content available</p>
    </div>
  );
}
