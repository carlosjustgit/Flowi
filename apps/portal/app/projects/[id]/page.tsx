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
  const [runningResearch, setRunningResearch] = useState(false);
  const [researchStatus, setResearchStatus] = useState<string | null>(null);
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

  const runResearchAgent = async () => {
    setRunningResearch(true);
    setResearchStatus('Finding onboarding report...');

    try {
      const onboardingArtifact = artifacts.find(
        (a) => a.type.includes('onboarding')
      );

      if (!onboardingArtifact) {
        throw new Error('No onboarding report found');
      }

      setResearchStatus('Creating research job...');

      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .insert({
          project_id: projectId,
          type: 'research',
          status: 'pending',
        })
        .select()
        .single();

      if (jobError) throw jobError;

      setResearchStatus('Running YOUR research agent...');

      const apiUrl = 'https://flow-productions-onboarding-cjoo9s0pm-carlos-projects-7e35eb7d.vercel.app';
      const response = await fetch(`${apiUrl}/api/workers/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          input_artifact_id: onboardingArtifact.id,
          job_id: job.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Research failed');
      }

      setResearchStatus('✅ Research complete! Refreshing...');
      await loadProjectData();
      
      setTimeout(() => {
        setResearchStatus(null);
        setRunningResearch(false);
      }, 3000);

    } catch (error) {
      console.error('Error:', error);
      setResearchStatus(`❌ ${error instanceof Error ? error.message : 'Error'}`);
      setTimeout(() => {
        setResearchStatus(null);
        setRunningResearch(false);
      }, 5000);
    }
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
            <button
              onClick={runResearchAgent}
              disabled={runningResearch}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2"
            >
              {runningResearch ? '⟳ Running...' : '🔬 Run Research Agent'}
            </button>
          </div>

          {researchStatus && (
            <div className={`mb-6 p-4 rounded ${
              researchStatus.includes('✅') ? 'bg-green-50 text-green-800' :
              researchStatus.includes('❌') ? 'bg-red-50 text-red-800' :
              'bg-blue-50 text-blue-800'
            }`}>
              {researchStatus}
            </div>
          )}

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
