import { NextRequest, NextResponse } from 'next/server';
import { getJob, updateJobStatus } from '@/lib/orchestrator';
import { createServiceClient } from '@/lib/flow-core';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * POST /api/orchestrator/jobs/:id/run
 * Run a job based on its type
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: jobId } = await params;

    // Get job details
    const job = await getJob(jobId);

    // Check if job is already done (idempotency check)
    if ((job as any).status === 'done') {
      return NextResponse.json(
        {
          job_id: (job as any).id,
          status: (job as any).status,
          message: 'Job already completed',
          output_artifacts: (job as any).output_artifact_id ? [(job as any).output_artifact_id] : []
        },
        { status: 200 }
      );
    }

    // Check if job is in a valid state to run
    if ((job as any).status !== 'queued' && (job as any).status !== 'failed') {
      return NextResponse.json(
        { error: `Job cannot be run in status: ${(job as any).status}` },
        { status: 400 }
      );
    }

    // Update job status to running
    await updateJobStatus(jobId, 'running');

    // Fetch project to get the language for this job
    const supabase = createServiceClient();
    const { data: project } = await supabase
      .from('projects')
      .select('language')
      .eq('id', (job as any).project_id)
      .single();
    const language: string = (project as any)?.language ?? 'pt';

    // Route to appropriate worker based on job type
    const workerUrl = new URL(
      `/api/workers/${(job as any).type}`,
      request.url
    ).toString();

    const workerResponse = await fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project_id: (job as any).project_id,
        input_artifact_id: (job as any).input_artifact_id,
        job_id: (job as any).id,
        language
      })
    });

    if (!workerResponse.ok) {
      const errorText = await workerResponse.text();
      await updateJobStatus(jobId, 'failed', errorText);
      return NextResponse.json(
        { error: `Worker failed: ${errorText}` },
        { status: 500 }
      );
    }

    const workerResult = await workerResponse.json();

    // Get updated job status
    const updatedJob = await getJob(jobId);

    return NextResponse.json(
      {
        job_id: (updatedJob as any).id,
        status: (updatedJob as any).status,
        output_artifacts: workerResult.artifacts || []
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in POST /api/orchestrator/jobs/:id/run:', error);
    
    try {
      const { id: jobId } = await params;
      await updateJobStatus(
        jobId,
        'failed',
        error instanceof Error ? error.message : 'Unknown error'
      );
    } catch (updateError) {
      console.error('Failed to update job status:', updateError);
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
