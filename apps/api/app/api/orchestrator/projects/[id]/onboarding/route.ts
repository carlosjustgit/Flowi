import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@flow/core';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * POST /api/orchestrator/projects/:id/onboarding
 * Ingest onboarding report and create research job
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { onboarding_report, format = 'md' } = body;

    if (!onboarding_report || typeof onboarding_report !== 'string') {
      return NextResponse.json(
        { error: 'onboarding_report is required and must be a string' },
        { status: 400 }
      );
    }

    if (!['md', 'json'].includes(format)) {
      return NextResponse.json(
        { error: 'format must be either "md" or "json"' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Verify project exists
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Create artifact for onboarding report
    const { data: artifact, error: artifactError } = await supabase
      .from('artifacts')
      .insert({
        project_id: projectId,
        type: 'onboarding_report',
        format: format,
        title: 'Onboarding Report',
        content: format === 'md' ? onboarding_report : null,
        content_json: format === 'json' ? JSON.parse(onboarding_report) : null
      } as any)
      .select()
      .single();

    if (artifactError) {
      console.error('Failed to create artifact:', artifactError);
      return NextResponse.json(
        { error: `Failed to create artifact: ${artifactError.message}` },
        { status: 500 }
      );
    }

    // Create research job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        project_id: projectId,
        type: 'research',
        status: 'queued',
        input_artifact_id: (artifact as any).id
      } as any)
      .select()
      .single();

    if (jobError) {
      console.error('Failed to create job:', jobError);
      return NextResponse.json(
        { error: `Failed to create job: ${jobError.message}` },
        { status: 500 }
      );
    }

      return NextResponse.json(
        {
          job_id: (job as any).id,
          artifact_id: (artifact as any).id
        },
        { status: 201 }
      );
  } catch (error) {
    console.error('Error in POST /api/orchestrator/projects/:id/onboarding:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
