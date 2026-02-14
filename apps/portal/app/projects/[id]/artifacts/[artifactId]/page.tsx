'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import ArtifactViewer from '@/components/ArtifactViewer';

interface Artifact {
  id: string;
  project_id: string;
  type: string;
  format: string;
  title: string | null;
  content: string | null;
  content_json: any | null;
  created_at: string;
}

export default function ArtifactDetailPage() {
  const params = useParams();
  const projectId = params.id as string;
  const artifactId = params.artifactId as string;
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    loadArtifact();
  }, [artifactId]);

  const loadArtifact = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('artifacts')
        .select('*')
        .eq('id', artifactId)
        .single();

      if (error) throw error;

      setArtifact(data);
    } catch (err) {
      console.error('Error loading artifact:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading artifact...</p>
      </div>
    );
  }

  if (!artifact) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Artifact not found</p>
      </div>
    );
  }

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
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {artifact.title || artifact.type}
            </h1>
            <p className="text-sm text-gray-600">
              Format: {artifact.format} | Created {new Date(artifact.created_at).toLocaleString()}
            </p>
          </div>

          <ArtifactViewer artifact={artifact} />
        </div>
      </div>
    </div>
  );
}
