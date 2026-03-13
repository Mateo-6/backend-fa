/**
 * AWS Deployment Configuration Example
 * Copy this file to aws-deploy.config.js and update with your values
 */

module.exports = {
  // AWS Region
  region: 'us-east-1',
  
  // Application name
  appName: 'financial-app-api',
  
  // Environment name (for Elastic Beanstalk)
  environment: 'production',
  
  // AWS Profile (from ~/.aws/credentials)
  profile: 'default',
  
  // Deployment type: 'eb' (Elastic Beanstalk), 'ecs', 'lambda', or 's3'
  deploymentType: 'eb',
  
  // S3 bucket for deployments (will be created if it doesn't exist)
  s3Bucket: 'financial-app-api-deployments',
  
  // Additional options
  options: {
    // For Elastic Beanstalk
    platform: 'Node.js 18',
    
    // For Lambda
    lambdaFunctionName: 'financial-app-api-handler',
    lambdaHandler: 'dist/index.handler',
    lambdaRuntime: 'nodejs18.x',
    lambdaMemorySize: 512,
    lambdaTimeout: 30,
    
    // For ECS
    ecsCluster: 'financial-app-cluster',
    ecsService: 'financial-app-service',
    ecrRepository: 'financial-app-api'
  }
};
