'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface Project {
  id: string;
  client_name: string;
  created_at: string;
}

interface Artifact {
  id: string;
  type: string;
  format: string;
  title: string | null;
  created_at: string;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [project, setProject] = useState<Project | null>(null);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  const loadProjectData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;

      const { data: artifactsData, error: artifactsError } = await supabase
        .from('artifacts')
        .select('id, type, format, title, created_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (artifactsError) throw artifactsError;

      setProject(projectData);
      setArtifacts(artifactsData || []);
    } catch (err) {
      console.error('Error loading project:', err);
    } finally {
      setLoading(false);
    }
  };

  const groupArtifactsByType = () => {
    const grouped: Record<string, Artifact[]> = {};
    artifacts.forEach((artifact) => {
      if (!grouped[artifact.type]) {
        grouped[artifact.type] = [];
      }
      grouped[artifact.type].push(artifact);
    });
    return grouped;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading project...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Project not found</p>
      </div>
    );
  }

  const groupedArtifacts = groupArtifactsByType();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/projects" className="text-blue-600 hover:text-blue-800">
                ← Back to Projects
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{project.client_name}</h1>
          <p className="text-sm text-gray-600 mb-6">
            Created {new Date(project.created_at).toLocaleDateString()}
          </p>

          <div className="flex space-x-4 mb-8">
            <Link
              href={`/projects/${projectId}/approvals`}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Approvals
            </Link>
            <Link
              href={`/projects/${projectId}/chat`}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Chat (Phase 2)
            </Link>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">Artifacts</h2>

          {Object.keys(groupedArtifacts).length === 0 ? (
            <p className="text-gray-600">No artifacts yet.</p>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedArtifacts).map(([type, typeArtifacts]) => (
                <div key={type} className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 capitalize">
                    {type.replace(/_/g, ' ')}
                  </h3>
                  <ul className="space-y-2">
                    {typeArtifacts.map((artifact) => (
                      <li key={artifact.id}>
                        <Link
                          href={`/projects/${projectId}/artifacts/${artifact.id}`}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {artifact.title || `${artifact.type} (${artifact.format})`}
                        </Link>
                        <span className="text-sm text-gray-500 ml-2">
                          {new Date(artifact.created_at).toLocaleString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
