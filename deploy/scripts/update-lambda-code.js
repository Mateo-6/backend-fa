const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DEPLOY_DIR = path.resolve(__dirname, '..');
const PROJECT_ROOT = path.resolve(DEPLOY_DIR, '..');

/**
 * Updates only the Lambda function code without recreating infrastructure.
 * All paths are resolved relative to the deploy/ folder.
 * 
 * @param {Object} options - Deployment options (region, stackName, etc.)
 * @returns {Promise<void>} Resolves when code update completes
 */
async function updateLambdaCode(options = {}) {
  const {
    region = process.env.AWS_REGION || 'us-east-1',
    stackName = process.env.AWS_STACK_NAME || 'ami-api-lambda',
    profile = process.env.AWS_PROFILE,
  } = options;

  console.log('⚡ Updating Lambda function code (fast mode)...');
  console.log(`📦 Stack Name: ${stackName}`);
  console.log(`🌍 Region: ${region}`);
  console.log(`📂 Project Root: ${PROJECT_ROOT}\n`);

  checkPrerequisites();

  const templatePath = path.join(DEPLOY_DIR, 'sam-templates', 'template-lambda.yaml');

  try {
    console.log('🔍 Verifying stack exists...');
    try {
      execSync(
        `aws cloudformation describe-stacks --stack-name ${stackName} --region ${region} ${profile ? `--profile ${profile}` : ''} --query "Stacks[0].StackName" --output text`,
        { encoding: 'utf-8', stdio: 'pipe' }
      );
      console.log(`✅ Stack found: ${stackName}\n`);
    } catch (error) {
      console.error(`\n❌ Stack "${stackName}" not found!`);
      console.error('\n💡 Please create the stack first by running:');
      console.error('   node scripts/deploy-lambda-infra.js');
      process.exit(1);
    }

    console.log('📦 Building TypeScript...');
    execSync('npm run build', { stdio: 'inherit', cwd: PROJECT_ROOT });

    console.log('\n🔨 Building SAM application...');
    execSync(`sam build --template ${templatePath}`, { stdio: 'inherit', cwd: DEPLOY_DIR });

    console.log('\n🚀 Uploading code to Lambda (fast method)...');
    
    const functionName = getFunctionNameFromStack(stackName, region, profile);
    
    const buildDir = path.join(DEPLOY_DIR, '.aws-sam', 'build', 'AmiFunction');
    const zipFile = path.join(buildDir, `${functionName}.zip`);
    
    let updateCommand;
    if (fs.existsSync(zipFile)) {
      updateCommand = [
        'aws lambda update-function-code',
        `--function-name ${functionName}`,
        `--zip-file fileb://${zipFile}`,
        `--region ${region}`,
        profile ? `--profile ${profile}` : ''
      ].filter(Boolean).join(' ');
    } else {
      const tempZip = path.join(DEPLOY_DIR, `.lambda-update-${Date.now()}.zip`);
      console.log('📦 Creating deployment package from build...');
      await createZipFromDirectory(buildDir, tempZip);
      
      updateCommand = [
        'aws lambda update-function-code',
        `--function-name ${functionName}`,
        `--zip-file fileb://${tempZip}`,
        `--region ${region}`,
        profile ? `--profile ${profile}` : ''
      ].filter(Boolean).join(' ');
      
      setTimeout(() => {
        if (fs.existsSync(tempZip)) fs.unlinkSync(tempZip);
      }, 5000);
    }

    if (profile) process.env.AWS_PROFILE = profile;

    execSync(updateCommand, { stdio: 'inherit' });
    
    console.log('⏳ Waiting for function update...');
    execSync(
      [
        'aws lambda wait function-updated',
        `--function-name ${functionName}`,
        `--region ${region}`,
        profile ? `--profile ${profile}` : ''
      ].filter(Boolean).join(' '),
      { stdio: 'inherit' }
    );

    console.log('\n✅ Lambda function code updated successfully!');
    console.log(`📋 Stack: ${stackName}`);
  } catch (error) {
    console.error('\n❌ Code update failed:', error.message);
    console.error('\n💡 Tip: Make sure your stack exists. Run "node scripts/deploy-lambda-infra.js" first.');
    process.exit(1);
  }
}

/**
 * Gets the function name from CloudFormation stack
 * 
 * @param {string} stackName - CloudFormation stack name
 * @param {string} region - AWS region
 * @param {string} profile - AWS profile
 * @returns {string} Function name
 */
function getFunctionNameFromStack(stackName, region, profile) {
  const profileArg = profile ? `--profile ${profile}` : '';
  
  try {
    console.log('🔍 Getting function name from stack outputs...');
    const output = execSync(
      `aws cloudformation describe-stacks --stack-name ${stackName} --region ${region} ${profileArg} --query "Stacks[0].Outputs[?OutputKey=='AmiFunctionArn'].OutputValue" --output text`,
      { encoding: 'utf-8', stdio: 'pipe' }
    ).trim();
    
    if (output && output.includes('arn:aws:lambda')) {
      const functionName = output.split(':function:')[1].split(':')[0];
      console.log(`✅ Found function: ${functionName}`);
      return functionName;
    }
    
    console.log('🔍 Getting function name from stack resources...');
    const resourceOutput = execSync(
      `aws cloudformation describe-stack-resources --stack-name ${stackName} --region ${region} ${profileArg} --logical-resource-id AmiFunction --query "StackResources[0].PhysicalResourceId" --output text`,
      { encoding: 'utf-8', stdio: 'pipe' }
    ).trim();
    
    if (resourceOutput && resourceOutput !== 'None' && resourceOutput !== '') {
      console.log(`✅ Found function: ${resourceOutput}`);
      return resourceOutput;
    }
    
    console.log('🔍 Searching for Lambda function in stack resources...');
    const allResources = execSync(
      `aws cloudformation describe-stack-resources --stack-name ${stackName} --region ${region} ${profileArg} --query "StackResources[?ResourceType=='AWS::Lambda::Function'].PhysicalResourceId" --output text`,
      { encoding: 'utf-8', stdio: 'pipe' }
    ).trim();
    
    if (allResources && allResources !== 'None' && allResources !== '') {
      const functionName = allResources.split('\t')[0].split('\n')[0];
      console.log(`✅ Found function: ${functionName}`);
      return functionName;
    }
    
  } catch (error) {
    console.warn(`⚠️  Error getting function name: ${error.message}`);
  }
  
  console.error('\n❌ Could not find Lambda function in stack!');
  console.error(`   Stack: ${stackName}`);
  console.error(`   Region: ${region}`);
  throw new Error(`Lambda function not found in stack ${stackName}`);
}

/**
 * Creates a zip file from a directory
 * 
 * @param {string} sourceDir - Source directory to zip
 * @param {string} zipPath - Output zip file path
 * @returns {Promise<void>} Resolves when zip is created
 */
function createZipFromDirectory(sourceDir, zipPath) {
  return new Promise((resolve, reject) => {
    const archiver = require('archiver');
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 1 } });

    output.on('close', () => {
      console.log(`📦 Package size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
      resolve();
    });

    archive.on('error', (err) => reject(err));
    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

/**
 * Checks if required tools are installed
 * 
 * @returns {void}
 */
function checkPrerequisites() {
  try { execSync('sam --version', { stdio: 'ignore' }); } catch (error) {
    console.error('❌ Error: AWS SAM CLI is not installed.');
    process.exit(1);
  }
  try { execSync('aws --version', { stdio: 'ignore' }); } catch (error) {
    console.error('❌ Error: AWS CLI is not installed.');
    process.exit(1);
  }
}

// Main execution
const stackName = process.argv[2] || process.env.AWS_STACK_NAME || 'ami-api-lambda';
const region = process.env.AWS_REGION || 'us-east-1';
const profile = process.env.AWS_PROFILE;

updateLambdaCode({ region, stackName, profile }).catch((error) => {
  console.error('❌ Update error:', error);
  process.exit(1);
});
