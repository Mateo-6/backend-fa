const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Deploys the application to AWS
 * Supports multiple deployment targets: Elastic Beanstalk, ECS, Lambda, or S3
 * 
 * @param {string} deploymentType - Type of AWS deployment (eb, ecs, lambda, s3)
 * @param {Object} options - Deployment options (region, appName, etc.)
 * @returns {Promise<void>} Resolves when deployment completes
 */
async function deploy(deploymentType = 'lambda', options = {}) {
  const {
    region = process.env.AWS_REGION || 'us-east-1',
    appName = process.env.AWS_APP_NAME || 'financial-app-api',
    environment = process.env.AWS_ENVIRONMENT || 'production',
    profile = process.env.AWS_PROFILE || 'default'
  } = options;

  console.log('🚀 Starting deployment to AWS...');
  console.log(`📦 Deployment Type: ${deploymentType}`);
  console.log(`🌍 Region: ${region}`);
  console.log(`📱 App Name: ${appName}`);

  // Check if dist directory exists
  const distPath = path.join(process.cwd(), 'dist');
  if (!fs.existsSync(distPath)) {
    console.error('❌ Error: dist directory not found. Please run "npm run build" first.');
    process.exit(1);
  }

  // Check AWS CLI installation
  try {
    execSync('aws --version', { stdio: 'ignore' });
  } catch (error) {
    console.error('❌ Error: AWS CLI is not installed. Please install it first.');
    console.error('   Visit: https://aws.amazon.com/cli/');
    process.exit(1);
  }

  // Create deployment package
  const zipFileName = `${appName}-${Date.now()}.zip`;
  const zipPath = path.join(process.cwd(), zipFileName);

  try {
    console.log('📦 Creating deployment package...');
    createDeploymentPackage(distPath, zipPath);
    console.log(`✅ Package created: ${zipFileName}`);

    // Deploy based on type
    switch (deploymentType.toLowerCase()) {
      case 'eb':
        deployToElasticBeanstalk(zipPath, appName, environment, region, profile);
        break;
      case 'ecs':
        deployToECS(zipPath, appName, region, profile);
        break;
      case 'lambda':
        deployToLambda(zipPath, appName, region, profile);
        break;
      case 's3':
        deployToS3(zipPath, appName, region, profile);
        break;
      default:
        console.error(`❌ Unknown deployment type: ${deploymentType}`);
        console.log('Available types: eb, ecs, lambda, s3');
        process.exit(1);
    }

    // Clean up zip file
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
      console.log('🧹 Cleaned up deployment package');
    }

    console.log('✅ Deployment completed successfully!');
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }
    process.exit(1);
  }
}

/**
 * Creates a deployment package (zip file) with necessary files
 * 
 * @param {string} distPath - Path to the dist directory
 * @param {string} zipPath - Path where the zip file will be created
 * @returns {void}
 */
function createDeploymentPackage(distPath, zipPath) {
  const archiver = require('archiver');
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  return new Promise((resolve, reject) => {
    output.on('close', () => {
      console.log(`📦 Package size: ${archive.pointer()} bytes`);
      resolve();
    });

    archive.on('error', (err) => reject(err));
    archive.pipe(output);

    // Add dist files
    archive.directory(distPath, false);
    
    // Add package.json (for production dependencies)
    if (fs.existsSync('package.json')) {
      archive.file('package.json', { name: 'package.json' });
    }

    // Add package-lock.json if exists
    if (fs.existsSync('package-lock.json')) {
      archive.file('package-lock.json', { name: 'package-lock.json' });
    }

    // Add .env.example if exists (for reference)
    if (fs.existsSync('.env.example')) {
      archive.file('.env.example', { name: '.env.example' });
    }

    archive.finalize();
  });
}

/**
 * Deploys to AWS Elastic Beanstalk
 * 
 * @param {string} zipPath - Path to the deployment zip file
 * @param {string} appName - Application name
 * @param {string} environment - Environment name
 * @param {string} region - AWS region
 * @param {string} profile - AWS profile
 * @returns {void}
 */
function deployToElasticBeanstalk(zipPath, appName, environment, region, profile) {
  console.log('🌱 Deploying to Elastic Beanstalk...');
  
  const s3Bucket = `${appName}-deployments-${region}`;
  const s3Key = `versions/${path.basename(zipPath)}`;

  // Upload to S3
  console.log('📤 Uploading to S3...');
  execSync(
    `aws s3 cp ${zipPath} s3://${s3Bucket}/${s3Key} --region ${region} --profile ${profile}`,
    { stdio: 'inherit' }
  );

  // Create application version
  console.log('📝 Creating application version...');
  execSync(
    `aws elasticbeanstalk create-application-version ` +
    `--application-name ${appName} ` +
    `--version-label ${Date.now()} ` +
    `--source-bundle S3Bucket=${s3Bucket},S3Key=${s3Key} ` +
    `--region ${region} ` +
    `--profile ${profile}`,
    { stdio: 'inherit' }
  );

  // Update environment
  console.log('🔄 Updating environment...');
  execSync(
    `aws elasticbeanstalk update-environment ` +
    `--application-name ${appName} ` +
    `--environment-name ${environment} ` +
    `--version-label ${Date.now()} ` +
    `--region ${region} ` +
    `--profile ${profile}`,
    { stdio: 'inherit' }
  );
}

/**
 * Deploys to AWS ECS (Elastic Container Service)
 * 
 * @param {string} zipPath - Path to the deployment zip file
 * @param {string} appName - Application name
 * @param {string} region - AWS region
 * @param {string} profile - AWS profile
 * @returns {void}
 */
function deployToECS(zipPath, appName, region, profile) {
  console.log('🐳 Deploying to ECS...');
  console.log('⚠️  Note: ECS deployment requires Docker. Please ensure you have a Dockerfile.');
  
  // This is a placeholder - ECS typically requires Docker images
  // You would need to build and push a Docker image to ECR
  console.log('💡 For ECS deployment, consider using:');
  console.log('   1. Build Docker image: docker build -t ' + appName + ' .');
  console.log('   2. Push to ECR: aws ecr get-login-password | docker login ...');
  console.log('   3. Update ECS service: aws ecs update-service ...');
}

/**
 * Deploys to AWS Lambda
 * 
 * @param {string} zipPath - Path to the deployment zip file
 * @param {string} appName - Application name
 * @param {string} region - AWS region
 * @param {string} profile - AWS profile
 * @returns {void}
 */
function deployToLambda(zipPath, appName, region, profile) {
  console.log('⚡ Deploying to Lambda...');
  console.log('⚠️  Note: Lambda deployment requires serverless configuration.');
  
  const functionName = `${appName}-handler`;
  
  // Update Lambda function code
  execSync(
    `aws lambda update-function-code ` +
    `--function-name ${functionName} ` +
    `--zip-file fileb://${zipPath} ` +
    `--region ${region} ` +
    `--profile ${profile}`,
    { stdio: 'inherit' }
  );
}

/**
 * Deploys to AWS S3 (for static hosting or as artifact storage)
 * 
 * @param {string} zipPath - Path to the deployment zip file
 * @param {string} appName - Application name
 * @param {string} region - AWS region
 * @param {string} profile - AWS profile
 * @returns {void}
 */
function deployToS3(zipPath, appName, region, profile) {
  console.log('☁️  Deploying to S3...');
  
  const s3Bucket = `${appName}-deployments-${region}`;
  const s3Key = `versions/${path.basename(zipPath)}`;

  // Upload to S3
  execSync(
    `aws s3 cp ${zipPath} s3://${s3Bucket}/${s3Key} --region ${region} --profile ${profile}`,
    { stdio: 'inherit' }
  );

  console.log(`✅ Package uploaded to: s3://${s3Bucket}/${s3Key}`);
}

/**
 * Loads configuration from file if it exists
 * 
 * @returns {Object|null} Configuration object or null if file doesn't exist
 */
function loadConfig() {
  const configPath = path.join(process.cwd(), 'aws-deploy.config.js');
  if (fs.existsSync(configPath)) {
    try {
      return require(configPath);
    } catch (error) {
      console.warn('⚠️  Warning: Could not load aws-deploy.config.js:', error.message);
      return null;
    }
  }
  return null;
}

// Main execution
const config = loadConfig();
const deploymentType = process.argv[2] || process.env.DEPLOYMENT_TYPE || config?.deploymentType || 'eb';
const region = process.argv[3] || process.env.AWS_REGION || config?.region || 'us-east-1';
const appName = process.argv[4] || process.env.AWS_APP_NAME || config?.appName || 'financial-app-api';
const environment = process.argv[5] || process.env.AWS_ENVIRONMENT || config?.environment || 'production';
const profile = process.argv[6] || process.env.AWS_PROFILE || config?.profile || 'default';

// Check if archiver is installed
try {
  require.resolve('archiver');
} catch (error) {
  console.error('❌ Error: archiver package is required for deployment.');
  console.error('   Please install it: npm install --save-dev archiver');
  process.exit(1);
}

deploy(deploymentType, { region, appName, environment, profile }).catch((error) => {
  console.error('❌ Deployment error:', error);
  process.exit(1);
});
