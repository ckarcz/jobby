import {
  JobbyClient,
  JobbyError,
} from './index.js';

async function main(): Promise<void> {
  // Create a client with optional configuration
  const client = new JobbyClient({
    timeout: 15000,
  });

  console.log('=== LinkedIn Jobs Client Example ===\n');

  try {
    // Option 1: Simple search with parameters object
    console.log('--- Method 1: Direct search with params ---');
    const response = await client.jobs.queryForJobs({
      keyword: 'C#',
      location: 'United States',
      jobType: 'full-time',
      experienceLevel: 'senior',
      minimumSalary: '180,000',
      workplaceType: 'remote',
      listingAge: 'past-week',
      geoId: '103644278',
    }, { take: 5 });

    console.log(`Found ${response.results.length} jobs!`);
    console.log(`Search took ${response.metadata.durationMs}ms`);
    console.log(`Response: ${response.pagination.responseCount}, Returned: ${response.pagination.resultsCount}\n`);

    for (const job of response.results) {
      console.log(`📋 ${job.summary.position}`);
      console.log(`   🏢 ${job.summary.company.name}`);
      console.log(`   📍 ${job.summary.location}`);
      console.log(`   💰 ${job.summary.salary ?? 'Not specified'}`);
      console.log(`   🔗 ${job.url}`);
      if (job.summary.isNew) console.log(`   🆕 New listing`);
      if (job.summary.easyApply) console.log(`   ⚡ Easy Apply`);
      if (job.summary.highlight) console.log(`   ✨ ${job.summary.highlight}`);
      console.log('');
    }

    // Option 2: Fluent builder API
    console.log('\n--- Method 2: Fluent builder API ---');
    const response2 = await client.jobs
      .createSearch()
      .withKeyword('TypeScript')
      .withLocation('San Francisco')
      .withJobType('full-time')
      .withExperience('senior')
      .withWorkplaceType('remote')
      .takeResults(3)
      .execute();

    console.log(`Found ${response2.results.length} jobs!`);
    console.log(`Search took ${response2.metadata.durationMs}ms`);
    console.log(`Response: ${response2.pagination.responseCount}, Returned: ${response2.pagination.resultsCount}\n`);

    for (const job of response2.results) {
      console.log(`📋 ${job.summary.position}`);
      console.log(`   🏢 ${job.summary.company.name}`);
      console.log(`   📍 ${job.summary.location}`);
      console.log(`   💰 ${job.summary.salary ?? 'Not specified'}`);
      console.log(`   🔗 ${job.url}`);
      console.log('');
    }

    // Option 3: Get job details
    if (response.results[0]?.url) {
      console.log('\n--- Method 3: Get job details ---');
      const details = await client.jobs.queryForJobDetailsByUrl(response.results[0].url);

      console.log(`\nJob Details for: ${details.summary.position}`);
      console.log(`Company: ${details.summary.company.name}`);
      console.log(`Location: ${details.summary.location}`);
      console.log(`Type: ${details.details.employmentType ?? 'Not specified'}`);
      console.log(`Level: ${details.details.seniorityLevel ?? 'Not specified'}`);
      if (details.details.applyUrl) {
        console.log(`Apply: ${details.details.applyText ?? 'Apply'} - ${details.details.applyUrl}`);
      }
      if (details.summary.salary) {
        console.log(`Salary: ${details.summary.salary}`);
      }
      console.log(`\nDescription (first 500 chars):\n${details.details.description?.substring(0, 500)}...`);
    }

  } catch (error: unknown) {
    if (error instanceof JobbyError) {
      console.error(`Error [${error.code}]: ${error.message}`);
      if (error.retryable) {
        console.error('This error is retryable.');
      }
    } else {
      console.error('Unexpected error:', error);
    }
    process.exitCode = 1;
  }
}

void main();
