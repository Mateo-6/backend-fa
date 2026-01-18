const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Deploys S3 infrastructure (creates/updates CloudFormation stack)
 * This should be run once initially or when infrastructure changes
 * 
 * @param {Object} options - Deployment options (region, stackName, etc.)
 * @returns {Promise<void>} Resolves when deployment completes
 */
async function deployS3Infra(options = {}) {
  const {
    region = process.env.AWS_REGION || 'us-east-1',
    stackName = process.env.AWS_STACK_NAME || 'ami-api-s3',
    profile = process.env.AWS_PROFILE,
    noConfirm = process.env.NO_CONFIRM === 'true'
  } = options;

  console.log('🏗️  Deploying S3 infrastructure...');
  console.log(`📦 Stack Name: ${stackName}`);
  console.log(`🌍 Region: ${region}`);

  // Check prerequisites
  checkPrerequisites();

  try {
    // Build SAM application
    console.log('🔨 Building SAM application...');
    execSync(
      `sam build --template template-s3.yaml`,
      { stdio: 'inherit' }
    );

    // Deploy infrastructure
    console.log('🚀 Deploying infrastructure...');
    const deployCommand = [
      'sam deploy',
      `--config-file samconfig-s3.toml`,
      `--stack-name ${stackName}`,
      `--region ${region}`,
      noConfirm ? '--no-confirm-changeset' : ''
    ].filter(Boolean).join(' ');

    if (profile) {
      process.env.AWS_PROFILE = profile;
    }

    execSync(deployCommand, { stdio: 'inherit' });

    console.log('✅ S3 infrastructure deployed successfully!');
    console.log(`📋 Stack name: ${stackName}`);
  } catch (error) {
    console.error('❌ Infrastructure deployment failed:', error.message);
    process.exit(1);
  }
}

/**
 * Checks if required tools are installed
 * 
 * @returns {void}
 */
function checkPrerequisites() {
  try {
    execSync('sam --version', { stdio: 'ignore' });
  } catch (error) {
    console.error('❌ Error: AWS SAM CLI is not installed.');
    console.error('   Please install it: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html');
    process.exit(1);
  }

  try {
    execSync('aws --version', { stdio: 'ignore' });
  } catch (error) {
    console.error('❌ Error: AWS CLI is not installed.');
    console.error('   Please install it: https://aws.amazon.com/cli/');
    process.exit(1);
  }
}

// Main execution
const stackName = process.argv[2] || process.env.AWS_STACK_NAME || 'ami-api-s3';
const region = process.env.AWS_REGION || 'us-east-1';
const profile = process.env.AWS_PROFILE;
const noConfirm = process.argv.includes('--no-confirm') || process.env.NO_CONFIRM === 'true';

deployS3Infra({
  region,
  stackName,
  profile,
  noConfirm
}).catch((error) => {
  console.error('❌ Deployment error:', error);
  process.exit(1);
});
