const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DEPLOY_DIR = path.resolve(__dirname, '..');
const PROJECT_ROOT = path.resolve(DEPLOY_DIR, '..');

/**
 * Deploys S3 infrastructure (creates/updates CloudFormation stack)
 * Creates S3 bucket and CloudFront distribution for web app hosting.
 * All paths are resolved relative to the deploy/ folder.
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
  console.log(`📂 Project Root: ${PROJECT_ROOT}`);

  checkPrerequisites();

  const templatePath = path.join(DEPLOY_DIR, 'sam-templates', 'template-s3.yaml');
  const configPath = path.join(DEPLOY_DIR, 'sam-configs', 'samconfig-s3.toml');

  try {
    console.log('🔨 Building SAM application...');
    execSync(`sam build --template ${templatePath}`, { stdio: 'inherit', cwd: DEPLOY_DIR });

    let stackExists = false;
    try {
      const result = execSync(
        `aws cloudformation describe-stacks --stack-name ${stackName} --region ${region} ${profile ? `--profile ${profile}` : ''} --query "Stacks[0].StackStatus" --output text`,
        { encoding: 'utf-8', stdio: 'pipe' }
      ).trim();
      if (result && result !== 'None') {
        stackExists = true;
        console.log(`📋 Stack exists (Status: ${result}), updating...`);
      }
    } catch (error) {
      console.log('📋 Creating new stack (first time deployment)...');
    }

    console.log('🚀 Deploying infrastructure...');
    if (!stackExists) {
      console.log('   ⏱️  This may take 10-20 minutes (CloudFront distribution creation takes time)');
      console.log('   💡 Tip: You can check progress in AWS CloudFormation Console\n');
    }
    
    const env = { ...process.env };
    if (profile) env.AWS_PROFILE = profile;

    const args = [
      'deploy',
      '--config-file', configPath,
      '--stack-name', stackName,
      '--region', region,
      '--no-confirm-changeset',
      '--no-fail-on-empty-changeset'
    ];
    if (profile) args.push('--profile', profile);

    console.log('📝 Deploying S3 and CloudFront infrastructure...\n');

    const { spawn } = require('child_process');
    
    await new Promise((resolve, reject) => {
      const samProcess = spawn('sam', args, { stdio: 'inherit', env, shell: false, cwd: DEPLOY_DIR });

      let outputCount = 0;
      const outputTimer = setInterval(() => {
        outputCount++;
        const minutes = Math.floor(outputCount * 30 / 60);
        const seconds = (outputCount * 30) % 60;
        console.log(`\n⏳ Still processing... (${minutes}m ${seconds}s elapsed)`);
        console.log('   CloudFront distribution creation can take 15-20 minutes\n');
      }, 30000);

      samProcess.on('close', (code) => {
        clearInterval(outputTimer);
        code === 0 ? resolve() : reject(new Error(`sam deploy exited with code ${code}`));
      });
      samProcess.on('error', (error) => { clearInterval(outputTimer); reject(error); });

      const timeout = setTimeout(() => {
        clearInterval(outputTimer);
        samProcess.kill('SIGTERM');
        reject(new Error('Deployment timed out after 40 minutes. Check AWS Console for stack status.'));
      }, 40 * 60 * 1000);

      samProcess.on('close', () => { clearTimeout(timeout); clearInterval(outputTimer); });
    });

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
  try { execSync('sam --version', { stdio: 'ignore' }); } catch (error) {
    console.error('❌ Error: AWS SAM CLI is not installed.');
    console.error('   Please install it: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html');
    process.exit(1);
  }
  try { execSync('aws --version', { stdio: 'ignore' }); } catch (error) {
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

deployS3Infra({ region, stackName, profile, noConfirm }).catch((error) => {
  console.error('❌ Deployment error:', error);
  process.exit(1);
});
