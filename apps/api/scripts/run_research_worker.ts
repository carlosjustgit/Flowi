import { createServiceClient } from '@flow/core';
import { readFile } from 'fs/promises';
import { resolve } from 'path';

async function runSmokeTest() {
  console.log('🧪 Starting research worker smoke test...\n');

  try {
    // 1. Load fixture
    console.log('📂 Loading fixture...');
    const fixturePath = resolve(__dirname, '../fixtures/sample_onboarding_report.json');
    const fixture = JSON.parse(await readFile(fixturePath, 'utf-8'));
    console.log('✅ Fixture loaded\n');

    // 2. Create test project
    console.log('📝 Creating test project...');
    const supabase = createServiceClient();
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({ client_name: 'Test Client (Smoke Test)' } as any)
      .select()
      .single();

    if (projectError || !project) {
      throw new Error(`Failed to create project: ${projectError?.message}`);
    }
    console.log(`✅ Project created: ${(project as any).id}\n`);

    // 3. Create onboarding artifact
    console.log('📄 Creating onboarding artifact...');
    const { data: artifact, error: artifactError } = await supabase
      .from('artifacts')
      .insert({
        project_id: (project as any).id,
        type: 'onboarding_report_json',
        format: 'json',
        title: 'Test Onboarding Report',
        content_json: fixture
      } as any)
      .select()
      .single();

    if (artifactError || !artifact) {
      throw new Error(`Failed to create artifact: ${artifactError?.message}`);
    }
    console.log(`✅ Artifact created: ${(artifact as any).id}\n`);

    // 4. Create research job
    console.log('⚙️  Creating research job...');
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        project_id: (project as any).id,
        type: 'research',
        status: 'pending',
        input_artifact_id: (artifact as any).id
      } as any)
      .select()
      .single();

    if (jobError || !job) {
      throw new Error(`Failed to create job: ${jobError?.message}`);
    }
    console.log(`✅ Job created: ${(job as any).id}\n`);

    // 5. Call worker
    console.log('🚀 Calling research worker...');
    const workerUrl = process.env.WORKER_URL || 'http://localhost:3000/api/workers/research';
    const response = await fetch(workerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: (project as any).id,
        input_artifact_id: (artifact as any).id,
        job_id: (job as any).id
      })
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(`Worker failed: ${result.error || response.statusText}`);
    }
    
    console.log('✅ Worker completed successfully\n');
    console.log('📊 Worker response:', JSON.stringify(result, null, 2));

    // 6. Verify artifacts
    console.log('\n🔍 Verifying artifacts...');
    const { data: artifacts, error: artifactsError } = await supabase
      .from('artifacts')
      .select('id, type, format, title')
      .eq('project_id', (project as any).id);

    if (artifactsError) {
      throw new Error(`Failed to fetch artifacts: ${artifactsError.message}`);
    }

    console.log(`✅ Found ${artifacts?.length || 0} artifacts:`);
    artifacts?.forEach((art: any) => {
      console.log(`   - ${art.type} (${art.format}): ${art.title}`);
    });

    // 7. Verify job status
    console.log('\n📋 Verifying job status...');
    const { data: updatedJob, error: jobStatusError } = await supabase
      .from('jobs')
      .select('status, error')
      .eq('id', (job as any).id)
      .single();

    if (jobStatusError) {
      throw new Error(`Failed to fetch job status: ${jobStatusError.message}`);
    }

    console.log(`✅ Job status: ${(updatedJob as any).status}`);
    if ((updatedJob as any).error) {
      console.log(`⚠️  Job error: ${(updatedJob as any).error}`);
    }

    // 8. Check for run logs
    console.log('\n📈 Checking run logs...');
    const { data: runs, error: runsError } = await supabase
      .from('runs')
      .select('model, tokens_in, tokens_out, duration_ms, cost_estimate')
      .eq('job_id', (job as any).id);

    if (runsError) {
      console.log(`⚠️  Could not fetch runs: ${runsError.message}`);
    } else if (runs && runs.length > 0) {
      console.log(`✅ Found ${runs.length} run log(s):`);
      runs.forEach((run: any) => {
        console.log(`   - Model: ${run.model}, Tokens: ${run.tokens_in}→${run.tokens_out}, Duration: ${run.duration_ms}ms`);
      });
    } else {
      console.log('⚠️  No run logs found');
    }

    console.log('\n✨ Smoke test passed! ✨\n');
    console.log(`Project ID: ${(project as any).id}`);
    console.log(`View in portal: http://localhost:3001/projects/${(project as any).id}\n`);

  } catch (error) {
    console.error('\n❌ Smoke test failed:', error);
    process.exit(1);
  }
}

// Run the smoke test
runSmokeTest();
