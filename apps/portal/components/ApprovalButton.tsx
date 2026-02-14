'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';

interface ApprovalButtonProps {
  approvalId: string;
  onUpdate: () => void;
}

export default function ApprovalButton({ approvalId, onUpdate }: ApprovalButtonProps) {
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createSupabaseBrowserClient();

  const handleApproval = async (status: 'approved' | 'rejected') => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('approvals')
        .update({
          status,
          notes: notes || null
        })
        .eq('id', approvalId);

      if (error) throw error;

      setShowNotes(false);
      setNotes('');
      onUpdate();
    } catch (err) {
      console.error('Error updating approval:', err);
      alert('Failed to update approval');
    } finally {
      setLoading(false);
    }
  };

  if (showNotes) {
    return (
      <div className="space-y-2">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes (optional)"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          rows={3}
        />
        <div className="flex space-x-2">
          <button
            onClick={() => handleApproval('approved')}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            Approve
          </button>
          <button
            onClick={() => handleApproval('rejected')}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            Reject
          </button>
          <button
            onClick={() => setShowNotes(false)}
            disabled={loading}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowNotes(true)}
      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
    >
      Review
    </button>
  );
}
