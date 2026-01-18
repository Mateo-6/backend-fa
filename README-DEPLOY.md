# AWS Deployment Guide

This guide explains how to deploy the Financial App API to AWS using different deployment strategies.

## Prerequisites

1. **AWS Account**: You need an active AWS account
2. **AWS CLI**: Install and configure AWS CLI
   ```bash
   # Install AWS CLI
   brew install awscli  # macOS
   # or visit: https://aws.amazon.com/cli/
   
   # Configure credentials
   aws configure
   ```
3. **Docker** (for ECS deployment): Install Docker Desktop
   ```bash
   # macOS
   brew install --cask docker
   ```

## Deployment Options

### Option 1: AWS Elastic Beanstalk (Recommended for beginners)

**Pros:**
- Easiest to set up
- Automatic scaling and load balancing
- Built-in health monitoring
- No need to manage infrastructure

**Cons:**
- Less control over infrastructure
- Can be more expensive at scale

#### Steps:

1. **Configure deployment settings:**
   ```bash
   cp aws-deploy.config.example.js aws-deploy.config.js
   # Edit aws-deploy.config.js with your settings
   ```

2. **Set environment variables:**
   ```bash
   export AWS_REGION=us-east-1
   export AWS_APP_NAME=financial-app-api
   export AWS_ENVIRONMENT=production
   export AWS_PROFILE=default
   ```

3. **Build and deploy:**
   ```bash
   npm run deploy eb
   ```

4. **Set environment variables in Elastic Beanstalk:**
   - Go to AWS Console → Elastic Beanstalk → Your Environment → Configuration → Software
   - Add environment variables:
     - `MONGO_URL`: Your MongoDB connection string
     - `JWT_SECRET`: Your JWT secret key
     - `PORT`: 8080 (Elastic Beanstalk uses this port)

5. **Configure MongoDB:**
   - Use MongoDB Atlas (recommended) or AWS DocumentDB
   - Update `MONGO_URL` in Elastic Beanstalk environment variables

### Option 2: AWS ECS with Fargate (Recommended for production)

**Pros:**
- Full control over containers
- Better cost optimization
- More flexible scaling
- Modern containerized approach

**Cons:**
- More complex setup
- Requires Docker knowledge

#### Steps:

1. **Build and push Docker image:**
   ```bash
   # Build the image
   docker build -t financial-app-api:latest .
   
   # Get AWS account ID
   AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
   AWS_REGION=us-east-1
   
   # Create ECR repository (if not exists)
   aws ecr create-repository --repository-name financial-app-api --region $AWS_REGION
   
   # Login to ECR
   aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
   
   # Tag and push
   docker tag financial-app-api:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/financial-app-api:latest
   docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/financial-app-api:latest
   ```

2. **Create ECS Cluster:**
   ```bash
   aws ecs create-cluster --cluster-name financial-app-cluster --region us-east-1
   ```

3. **Create Task Definition:**
   - Update `aws-config/ecs-task-definition.json` with your account ID and region
   - Register the task definition:
   ```bash
   aws ecs register-task-definition --cli-input-json file://aws-config/ecs-task-definition.json
   ```

4. **Create ECS Service:**
   - Update `aws-config/ecs-service.json` with your VPC subnets and security groups
   - Create the service:
   ```bash
   aws ecs create-service --cli-input-json file://aws-config/ecs-service.json
   ```

5. **Or use the automated deploy script:**
   ```bash
   npm run deploy ecs
   ```

### Option 3: AWS App Runner (Serverless-like)

**Pros:**
- Very simple setup
- Automatic scaling
- Pay per use

**Cons:**
- Less control
- Newer service (may have limitations)

#### Steps:

1. **Push code to GitHub or use ECR**
2. **Create App Runner service via AWS Console:**
   - Go to AWS App Runner
   - Create new service
   - Connect to source (GitHub or ECR)
   - Configure build and runtime settings
   - Set environment variables

## Environment Variables

Set these environment variables in your AWS deployment:

```bash
MONGO_URL=mongodb://username:password@host:port/database?authSource=admin
JWT_SECRET=your-secret-key-here
NODE_ENV=production
PORT=3000  # or 8080 for Elastic Beanstalk
```

## MongoDB Setup

### Option A: MongoDB Atlas (Recommended)

1. Create account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a cluster
3. Get connection string
4. Add your AWS IP addresses to whitelist
5. Update `MONGO_URL` in AWS environment variables

### Option B: AWS DocumentDB

1. Create DocumentDB cluster in AWS
2. Configure security groups
3. Get connection string
4. Update `MONGO_URL` in AWS environment variables

## Security Best Practices

1. **Never commit secrets**: Use AWS Systems Manager Parameter Store or Secrets Manager
2. **Use IAM roles**: Don't hardcode AWS credentials
3. **Enable HTTPS**: Use AWS Certificate Manager (ACM) for SSL certificates
4. **Configure security groups**: Only allow necessary ports
5. **Use VPC**: Deploy in private subnets when possible
6. **Enable CloudWatch Logs**: Monitor your application

## Monitoring

### CloudWatch Logs

View logs in AWS CloudWatch:
- Elastic Beanstalk: `/aws/elasticbeanstalk/financial-app-api`
- ECS: `/ecs/financial-app-api`

### Health Checks

The application exposes a `/health` endpoint that AWS services can use for health checks.

## Troubleshooting

### Elastic Beanstalk

- Check environment health in AWS Console
- View logs: `eb logs` (if using EB CLI) or CloudWatch
- Common issues:
  - Port mismatch (use 8080, not 3000)
  - Missing environment variables
  - Database connection issues

### ECS

- Check task status: `aws ecs describe-tasks --cluster financial-app-cluster --tasks TASK_ID`
- View logs in CloudWatch
- Common issues:
  - Task failing to start: Check task definition and logs
  - Network issues: Verify security groups and subnets
  - Image pull errors: Check ECR permissions

## Cost Estimation

- **Elastic Beanstalk**: ~$30-50/month (t2.micro instance)
- **ECS Fargate**: ~$15-30/month (0.25 vCPU, 0.5GB RAM, minimal traffic)
- **App Runner**: Pay per request, ~$5-20/month for low traffic

*Prices are approximate and vary by region and usage*

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy to AWS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      - run: npm run deploy eb
```

## Support

For issues or questions:
1. Check AWS CloudWatch logs
2. Review application logs
3. Verify environment variables
4. Check AWS service health dashboards
