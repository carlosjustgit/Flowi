'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import ApprovalButton from '@/components/ApprovalButton';

interface Approval {
  id: string;
  artifact_id: string;
  status: string;
  notes: string | null;
  created_at: string;
  artifact: {
    id: string;
    type: string;
    title: string | null;
  };
}

export default function ApprovalsPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    loadApprovals();
  }, [projectId]);

  const loadApprovals = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('approvals')
        .select(`
          *,
          artifact:artifacts (
            id,
            type,
            title
          )
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setApprovals(data || []);
    } catch (err) {
      console.error('Error loading approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalUpdate = () => {
    loadApprovals();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading approvals...</p>
      </div>
    );
  }

  const pendingApprovals = approvals.filter(a => a.status === 'pending');
  const completedApprovals = approvals.filter(a => a.status !== 'pending');

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
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Approvals</h1>

          {pendingApprovals.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Pending Approvals</h2>
              <div className="space-y-4">
                {pendingApprovals.map((approval) => (
                  <div key={approval.id} className="bg-white rounded-lg shadow p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {approval.artifact.title || approval.artifact.type}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Created {new Date(approval.created_at).toLocaleString()}
                        </p>
                        <Link
                          href={`/projects/${projectId}/artifacts/${approval.artifact_id}`}
                          className="text-blue-600 hover:text-blue-800 text-sm mt-2 inline-block"
                        >
                          View Artifact →
                        </Link>
                      </div>
                      <ApprovalButton
                        approvalId={approval.id}
                        onUpdate={handleApprovalUpdate}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {completedApprovals.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Completed Approvals</h2>
              <div className="space-y-4">
                {completedApprovals.map((approval) => (
                  <div key={approval.id} className="bg-white rounded-lg shadow p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {approval.artifact.title || approval.artifact.type}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Status: <span className={`font-semibold ${approval.status === 'approved' ? 'text-green-600' : 'text-red-600'}`}>
                            {approval.status}
                          </span>
                        </p>
                        {approval.notes && (
                          <p className="text-sm text-gray-600 mt-2">
                            Notes: {approval.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {approvals.length === 0 && (
            <p className="text-gray-600">No approvals yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
