const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DEPLOY_DIR = path.resolve(__dirname, '..');
const PROJECT_ROOT = path.resolve(DEPLOY_DIR, '..');

/**
 * Deploys Lambda infrastructure (creates/updates CloudFormation stack)
 * This should be run once initially or when infrastructure changes.
 * All paths are resolved relative to the deploy/ folder.
 * 
 * @param {Object} options - Deployment options (region, stackName, mongoUri, etc.)
 * @returns {Promise<void>} Resolves when deployment completes
 */
async function deployLambdaInfra(options = {}) {
  const {
    region = process.env.AWS_REGION || 'us-east-1',
    stackName = process.env.AWS_STACK_NAME || 'ami-api-lambda',
    mongoUri = process.env.MONGO_URI || process.env.MONGO_URL,
    profile = process.env.AWS_PROFILE,
    noConfirm = process.env.NO_CONFIRM === 'true',
    guided = process.env.GUIDED === 'true' || options.guided === true
  } = options;

  console.log('🏗️  Deploying Lambda infrastructure...');
  console.log(`📦 Stack Name: ${stackName}`);
  console.log(`🌍 Region: ${region}`);
  console.log(`📂 Project Root: ${PROJECT_ROOT}`);

  checkPrerequisites();

  if (!guided && !mongoUri) {
    console.error('❌ Error: MONGO_URI or MONGO_URL is required for Lambda deployment');
    console.error('   Please set MONGO_URI or MONGO_URL environment variable:');
    console.error('   export MONGO_URI="mongodb+srv://user:pass@cluster.mongodb.net/dbname"');
    console.error('   Or pass it as an argument: node scripts/deploy-lambda-infra.js <stack-name> <mongo-uri>');
    console.error('   Or use --guided mode: node scripts/deploy-lambda-infra.js --guided');
    process.exit(1);
  }

  const templatePath = path.join(DEPLOY_DIR, 'sam-templates', 'template-lambda.yaml');
  const configPath = path.join(DEPLOY_DIR, 'sam-configs', 'samconfig-lambda.toml');

  try {
    console.log('📦 Building TypeScript...');
    execSync('npm run build', { stdio: 'inherit', cwd: PROJECT_ROOT });

    console.log('🔨 Building SAM application...');
    execSync(`sam build --template ${templatePath}`, { stdio: 'inherit', cwd: DEPLOY_DIR });

    console.log('📦 Ensuring S3 bucket exists for code storage...');
    const bucketName = `sam-cli-deployments-${region}`;
    
    try {
      execSync(
        `aws s3api head-bucket --bucket ${bucketName} --region ${region} ${profile ? `--profile ${profile}` : ''} 2>&1`,
        { stdio: 'pipe', encoding: 'utf-8' }
      );
      console.log(`✅ S3 bucket exists: ${bucketName}`);
    } catch (error) {
      console.log(`📦 Creating S3 bucket: ${bucketName}...`);
      try {
        execSync(
          `aws s3 mb s3://${bucketName} --region ${region} ${profile ? `--profile ${profile}` : ''}`,
          { stdio: 'inherit' }
        );
        console.log(`✅ S3 bucket created successfully: ${bucketName}`);
        
        console.log('⏳ Waiting for bucket to be fully available...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        try {
          execSync(
            `aws s3api head-bucket --bucket ${bucketName} --region ${region} ${profile ? `--profile ${profile}` : ''} 2>&1`,
            { stdio: 'pipe', encoding: 'utf-8' }
          );
          const testFile = `/tmp/sam-bucket-test-${Date.now()}.txt`;
          fs.writeFileSync(testFile, `test-${Date.now()}`);
          try {
            execSync(
              `aws s3 cp ${testFile} s3://${bucketName}/test.txt --region ${region} ${profile ? `--profile ${profile}` : ''} 2>&1`,
              { stdio: 'pipe', encoding: 'utf-8' }
            );
            execSync(
              `aws s3 rm s3://${bucketName}/test.txt --region ${region} ${profile ? `--profile ${profile}` : ''} 2>&1`,
              { stdio: 'pipe', encoding: 'utf-8' }
            );
            fs.unlinkSync(testFile);
            console.log(`✅ Bucket verified, accessible, and writable: ${bucketName}`);
          } catch (writeError) {
            console.warn('⚠️  Bucket exists but write test failed. SAM may still work...');
            if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
          }
        } catch (verifyError) {
          console.warn('⚠️  Bucket created but verification failed. Continuing anyway...');
        }
      } catch (createError) {
        console.error(`❌ Failed to create S3 bucket: ${bucketName}`);
        console.error('   Error:', createError.message);
        console.error('\n💡 Possible solutions:');
        console.error(`   1. Create bucket manually: aws s3 mb s3://${bucketName} --region ${region}`);
        console.error('   2. Check your AWS credentials and permissions');
        throw new Error(`S3 bucket creation failed. Please create ${bucketName} manually or check permissions.`);
      }
    }

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
    
    try {
      const oldStackResult = execSync(
        `aws cloudformation describe-stacks --stack-name ami-api --region ${region} ${profile ? `--profile ${profile}` : ''} --query "Stacks[0].StackStatus" --output text 2>/dev/null`,
        { encoding: 'utf-8', stdio: 'pipe' }
      ).trim();
      if (oldStackResult && oldStackResult !== 'None') {
        console.warn(`⚠️  Warning: Old combined stack "ami-api" exists (Status: ${oldStackResult})`);
        console.warn(`   This might cause conflicts. Consider deleting it if you want separate stacks.`);
      }
    } catch (error) {
      // Old stack doesn't exist, which is fine
    }

    console.log('🚀 Deploying infrastructure...');
    const env = { ...process.env };
    if (profile) env.AWS_PROFILE = profile;

    if (guided) {
      console.log('   📋 Guided mode: SAM CLI will prompt you for configuration');
      console.log('   💡 Tip: Your answers will be saved for future deployments\n');
      
      const guidedCommand = [
        'sam deploy',
        '--guided',
        '--template', templatePath,
        '--s3-bucket', bucketName
      ].join(' ');
      
      if (mongoUri) env.SAM_CLI_MONGO_URI = mongoUri;
      if (stackName) env.SAM_CLI_STACK_NAME = stackName;
      
      console.log('📝 Deploying with S3 bucket:', bucketName);
      execSync(guidedCommand, { stdio: 'inherit', env, shell: true, cwd: DEPLOY_DIR });
    } else {
      console.log('   ⏱️  Expected time: 2-5 minutes (Lambda + API Gateway only)');
      console.log('   💡 Tip: You can check progress in AWS CloudFormation Console\n');
      
      const args = [
        'deploy',
        '--config-file', configPath,
        '--stack-name', stackName,
        '--parameter-overrides', `MongoUri=${mongoUri}`,
        '--region', region,
        '--no-confirm-changeset',
        '--no-fail-on-empty-changeset',
        '--s3-bucket', bucketName
      ];
      if (profile) args.push('--profile', profile);
      
      console.log('📝 Deploying with parameters...');
      console.log('   S3 Bucket:', bucketName);
      console.log('   Stack:', stackName);
      
      const { spawn } = require('child_process');
      
      await new Promise((resolve, reject) => {
        const samProcess = spawn('sam', args, { stdio: 'inherit', env, shell: false, cwd: DEPLOY_DIR });

        let outputCount = 0;
        const outputTimer = setInterval(() => {
          outputCount++;
          const minutes = Math.floor(outputCount * 30 / 60);
          const seconds = (outputCount * 30) % 60;
          console.log(`\n⏳ Still processing... (${minutes}m ${seconds}s elapsed)`);
        }, 30000);

        samProcess.on('close', (code) => {
          clearInterval(outputTimer);
          code === 0 ? resolve() : reject(new Error(`sam deploy exited with code ${code}`));
        });
        samProcess.on('error', (error) => { clearInterval(outputTimer); reject(error); });

        const timeout = setTimeout(() => {
          clearInterval(outputTimer);
          samProcess.kill('SIGTERM');
          reject(new Error('Deployment timed out after 30 minutes. Check AWS Console for stack status.'));
        }, 30 * 60 * 1000);

        samProcess.on('close', () => { clearTimeout(timeout); clearInterval(outputTimer); });
      });
    }

    console.log('\n✅ Lambda infrastructure deployed successfully!');
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
const stackName = process.argv[2] || process.env.AWS_STACK_NAME || 'ami-api-lambda';
const mongoUri = process.argv[3] || process.env.MONGO_URI || process.env.MONGO_URL;
const region = process.env.AWS_REGION || 'us-east-1';
const profile = process.env.AWS_PROFILE;
const noConfirm = process.argv.includes('--no-confirm') || process.env.NO_CONFIRM === 'true';
const guided = process.argv.includes('--guided') || process.env.GUIDED === 'true';

deployLambdaInfra({ region, stackName, mongoUri, profile, noConfirm, guided }).catch((error) => {
  console.error('❌ Deployment error:', error);
  process.exit(1);
});
