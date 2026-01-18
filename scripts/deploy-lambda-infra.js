const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Deploys Lambda infrastructure (creates/updates CloudFormation stack)
 * This should be run once initially or when infrastructure changes
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

  // Check prerequisites
  checkPrerequisites();

  // Validate required parameters (only for non-guided mode)
  if (!guided && !mongoUri) {
    console.error('❌ Error: MONGO_URI or MONGO_URL is required for Lambda deployment');
    console.error('   Please set MONGO_URI or MONGO_URL environment variable:');
    console.error('   export MONGO_URI="mongodb+srv://user:pass@cluster.mongodb.net/dbname"');
    console.error('   Or pass it as an argument: npm run aws:infra:lambda <stack-name> <mongo-uri>');
    console.error('   Or use --guided mode: npm run aws:infra:lambda -- --guided');
    process.exit(1);
  }

  try {
    // Build TypeScript
    console.log('📦 Building TypeScript...');
    execSync('npm run build', { stdio: 'inherit' });

    // Build SAM application
    console.log('🔨 Building SAM application...');
    execSync(
      `sam build --template template-lambda.yaml`,
      { stdio: 'inherit' }
    );

    // Ensure S3 bucket exists for SAM deployments (always create if missing)
    console.log('📦 Ensuring S3 bucket exists for code storage...');
    const bucketName = `sam-cli-deployments-${region}`;
    
    try {
      // Try to check if bucket exists
      execSync(
        `aws s3api head-bucket --bucket ${bucketName} --region ${region} ${profile ? `--profile ${profile}` : ''} 2>&1`,
        { stdio: 'pipe', encoding: 'utf-8' }
      );
      console.log(`✅ S3 bucket exists: ${bucketName}`);
    } catch (error) {
      // Bucket doesn't exist, create it
      console.log(`📦 Creating S3 bucket: ${bucketName}...`);
      try {
        execSync(
          `aws s3 mb s3://${bucketName} --region ${region} ${profile ? `--profile ${profile}` : ''}`,
          { stdio: 'inherit' }
        );
        console.log(`✅ S3 bucket created successfully: ${bucketName}`);
        
        // Wait a moment for S3 to fully register the bucket
        console.log('⏳ Waiting for bucket to be fully available...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Verify bucket is accessible and writable
        try {
          execSync(
            `aws s3api head-bucket --bucket ${bucketName} --region ${region} ${profile ? `--profile ${profile}` : ''} 2>&1`,
            { stdio: 'pipe', encoding: 'utf-8' }
          );
          // Test write permissions by uploading a test file
          const testContent = `test-${Date.now()}`;
          const testFile = `/tmp/sam-bucket-test-${Date.now()}.txt`;
          require('fs').writeFileSync(testFile, testContent);
          try {
            execSync(
              `aws s3 cp ${testFile} s3://${bucketName}/test.txt --region ${region} ${profile ? `--profile ${profile}` : ''} 2>&1`,
              { stdio: 'pipe', encoding: 'utf-8' }
            );
            // Clean up test file
            execSync(
              `aws s3 rm s3://${bucketName}/test.txt --region ${region} ${profile ? `--profile ${profile}` : ''} 2>&1`,
              { stdio: 'pipe', encoding: 'utf-8' }
            );
            require('fs').unlinkSync(testFile);
            console.log(`✅ Bucket verified, accessible, and writable: ${bucketName}`);
          } catch (writeError) {
            console.warn('⚠️  Bucket exists but write test failed. SAM may still work...');
            if (require('fs').existsSync(testFile)) {
              require('fs').unlinkSync(testFile);
            }
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
        console.error('   3. Ensure you have s3:CreateBucket permission');
        throw new Error(`S3 bucket creation failed. Please create ${bucketName} manually or check permissions.`);
      }
    }

    // Check if stack exists and also check for old combined stack
    let stackExists = false;
    let oldStackExists = false;
    
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
    
    // Check for old combined stack (ami-api) that might cause conflicts
    try {
      const oldStackResult = execSync(
        `aws cloudformation describe-stacks --stack-name ami-api --region ${region} ${profile ? `--profile ${profile}` : ''} --query "Stacks[0].StackStatus" --output text 2>/dev/null`,
        { encoding: 'utf-8', stdio: 'pipe' }
      ).trim();
      if (oldStackResult && oldStackResult !== 'None') {
        oldStackExists = true;
        console.warn(`⚠️  Warning: Old combined stack "ami-api" exists (Status: ${oldStackResult})`);
        console.warn(`   This might cause conflicts. Consider deleting it if you want separate stacks.`);
      }
    } catch (error) {
      // Old stack doesn't exist, which is fine
    }

    // Deploy infrastructure
    console.log('🚀 Deploying infrastructure...');
    if (!guided) {
      console.log('   ⏱️  Expected time: 2-5 minutes (Lambda + API Gateway only, no S3/CloudFront)');
      console.log('   💡 Tip: You can check progress in AWS CloudFormation Console');
      console.log('   ⚡ Optimized for fast deployment (Lambda infrastructure only)\n');
    } else {
      console.log('   📋 Guided mode: SAM CLI will prompt you for configuration');
      console.log('   💡 Tip: Your answers will be saved to samconfig-lambda.toml for future deployments\n');
    }
    
    // Prepare environment
    const env = { ...process.env };
    if (profile) {
      env.AWS_PROFILE = profile;
    }

    // Build deploy command arguments as array (avoids shell escaping issues)
    const args = ['deploy'];
    
    // Use the bucket that was already verified/created above (bucketName is in scope)
    
    // If guided mode, use --guided (interactive mode that worked before)
    if (guided) {
      console.log('📋 Using guided mode (interactive)...\n');
      
      // Build command with explicit bucket specification
      // Note: In guided mode with --s3-bucket, SAM may still ask to confirm, but will use this bucket
      const guidedCommand = [
        'sam deploy',
        '--guided',
        '--template', 'template-lambda.yaml',
        '--s3-bucket', bucketName
      ].join(' ');
      
      // Set environment variables that guided mode might need
      if (mongoUri) {
        env.SAM_CLI_MONGO_URI = mongoUri;
      }
      if (stackName) {
        env.SAM_CLI_STACK_NAME = stackName;
      }
      
      console.log('📝 Deploying with S3 bucket:', bucketName);
      console.log('');
      
      execSync(guidedCommand, {
        stdio: 'inherit',
        env: env,
        shell: true
      });
    } else {
      // Non-guided mode (automated) - use the bucket already created above
      args.push(
        '--config-file', 'samconfig-lambda.toml',
        '--stack-name', stackName,
        '--parameter-overrides', `MongoUri=${mongoUri}`,
        '--region', region,
        '--no-confirm-changeset',
        '--no-fail-on-empty-changeset',
        '--s3-bucket', bucketName // Use the bucket we ensured exists above
      );
      
      if (profile) {
        args.push('--profile', profile);
      }
      
      console.log('📝 Deploying with parameters...');
      console.log('   S3 Bucket:', bucketName);
      console.log('   Stack:', stackName);
      console.log('');
      
      // For automated mode, use spawn with better control
      const { spawn } = require('child_process');
      
      console.log('📋 Starting automated deployment...\n');
      
      await new Promise((resolve, reject) => {
        const samProcess = spawn('sam', args, {
          stdio: 'inherit',
          env: env,
          shell: false
        });

        let outputCount = 0;
        const outputTimer = setInterval(() => {
          outputCount++;
          const minutes = Math.floor(outputCount * 30 / 60);
          const seconds = (outputCount * 30) % 60;
          console.log(`\n⏳ Still processing... (${minutes}m ${seconds}s elapsed)`);
          console.log('   If this seems stuck, check AWS CloudFormation Console for actual progress');
          console.log('   You can also cancel (Ctrl+C) and use --guided mode instead\n');
        }, 30000); // Log every 30 seconds

        samProcess.on('close', (code) => {
          clearInterval(outputTimer);
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`sam deploy exited with code ${code}`));
          }
        });

        samProcess.on('error', (error) => {
          clearInterval(outputTimer);
          reject(error);
        });

        // Set overall timeout
        const timeoutDuration = 30 * 60 * 1000; // 30 minutes
        const timeout = setTimeout(() => {
          clearInterval(outputTimer);
          samProcess.kill('SIGTERM');
          reject(new Error(`Deployment timed out after 30 minutes. Check AWS Console for stack status.`));
        }, timeoutDuration);

        samProcess.on('close', () => {
          clearTimeout(timeout);
          clearInterval(outputTimer);
        });
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
const stackName = process.argv[2] || process.env.AWS_STACK_NAME || 'ami-api-lambda';
const mongoUri = process.argv[3] || process.env.MONGO_URI || process.env.MONGO_URL;
const region = process.env.AWS_REGION || 'us-east-1';
const profile = process.env.AWS_PROFILE;
const noConfirm = process.argv.includes('--no-confirm') || process.env.NO_CONFIRM === 'true';
const guided = process.argv.includes('--guided') || process.env.GUIDED === 'true';

deployLambdaInfra({
  region,
  stackName,
  mongoUri,
  profile,
  noConfirm,
  guided
}).catch((error) => {
  console.error('❌ Deployment error:', error);
  process.exit(1);
});
