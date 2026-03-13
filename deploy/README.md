# Deployment Guide - Financial App API

This folder contains all the infrastructure files, scripts, and configurations needed to deploy the Financial App API to AWS. **Everything runs from this `deploy/` folder** - no need to copy files to the project root.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Folder Structure](#folder-structure)
3. [Quick Start](#quick-start)
4. [Deployment Options](#deployment-options)
5. [Option 1: AWS Lambda + API Gateway (SAM)](#option-1-aws-lambda--api-gateway-sam)
6. [Option 2: AWS Elastic Beanstalk](#option-2-aws-elastic-beanstalk)
7. [Option 3: AWS ECS with Fargate](#option-3-aws-ecs-with-fargate)
8. [S3 + CloudFront (Frontend Hosting)](#s3--cloudfront-frontend-hosting)
9. [Local Development with Docker](#local-development-with-docker)
10. [Environment Variables](#environment-variables)
11. [Utility Scripts](#utility-scripts)
12. [Troubleshooting](#troubleshooting)
13. [Cost Estimation](#cost-estimation)
14. [CI/CD Integration](#cicd-integration)

---

## Prerequisites

1. **AWS CLI** installed and configured with your credentials
   ```bash
   brew install awscli
   aws configure
   ```
2. **AWS SAM CLI** installed (for Lambda deployments)
   ```bash
   brew install aws-sam-cli
   ```
3. **Node.js** (v16+) and **npm** installed
4. **Docker** (optional, for ECS deployments and local development)

Verify all prerequisites at once:
```bash
cd deploy
node scripts/check-prerequisites.js
```

---

## Folder Structure

```
deploy/
├── README.md                          # This file
├── docker-compose.yml                 # Local MongoDB & MySQL for development
│
├── sam-templates/                     # AWS SAM CloudFormation templates
│   ├── template.yaml                  # Full stack: Lambda + API Gateway + S3 + CloudFront
│   ├── template-lambda.yaml           # Lambda + API Gateway only
│   └── template-s3.yaml              # S3 + CloudFront only (frontend hosting)
│
├── sam-configs/                       # SAM CLI deployment configurations
│   ├── samconfig.toml
│   ├── samconfig-lambda.toml
│   └── samconfig-s3.toml
│
├── scripts/                           # Deployment & utility scripts
│   ├── deploy.js                      # Multi-target deploy (EB, ECS, Lambda, S3)
│   ├── deploy-lambda-infra.js         # Create/update Lambda CloudFormation stack
│   ├── deploy-s3-infra.js             # Create/update S3/CloudFront stack
│   ├── update-lambda-code.js          # Fast code-only Lambda update
│   ├── fix-stack.js                   # Fix stuck CloudFormation stacks
│   ├── check-prerequisites.js         # Verify deployment prerequisites
│   ├── check-build.sh                 # Verify fa-contracts and TypeScript build
│   └── fix-fa-contracts.sh            # Rebuild fa-contracts package
│
├── aws-config/                        # AWS service configurations
│   ├── ecs-task-definition.json       # ECS Fargate task definition
│   └── ecs-service.json               # ECS service configuration
│
├── aws-deploy.config.example.js       # Deploy config example
│
├── elastic-beanstalk/                 # Elastic Beanstalk files
│   ├── .ebextensions/
│   │   ├── 01-docker.config
│   │   ├── environment.config
│   │   └── nodecommand.config
│   └── dockerrun/
│       ├── Dockerrun.aws.json
│       └── Dockerrun.aws.json.v2
│
└── lambda-local/                      # Lambda local testing files
    ├── event.json                     # Sample API Gateway event
    └── env.json.example               # Environment variables template
```

---

## Quick Start

All commands run from the `deploy/` folder:

```bash
cd deploy

# 1. Build the API project
npm run build --prefix ..

# 2. Deploy Lambda infrastructure (first time - guided)
node scripts/deploy-lambda-infra.js --guided

# 3. For subsequent code updates (fast)
node scripts/update-lambda-code.js
```

---

## Deployment Options

| Option | Best For | Complexity | Cost |
|--------|----------|------------|------|
| **Lambda + API Gateway** | Low-traffic APIs, serverless | Low | ~$0-5/month |
| **Elastic Beanstalk** | Beginners, managed hosting | Low | ~$30-50/month |
| **ECS Fargate** | Production, containerized | Medium | ~$15-30/month |

---

## Option 1: AWS Lambda + API Gateway (SAM)

This is the recommended deployment method.

### First Time Deployment (Guided)

```bash
cd deploy

# Build the project
npm run build --prefix ..

# Deploy with guided mode (SAM CLI will prompt for configuration)
node scripts/deploy-lambda-infra.js --guided
```

During the guided deploy, you'll be prompted for:
- **Stack Name**: `ami-api-lambda`
- **AWS Region**: `us-east-1`
- **Parameter MongoUri**: Your MongoDB Atlas connection string
- **Confirm changes before deploy**: `Y`
- **Allow SAM CLI IAM role creation**: `Y`

### First Time Deployment (Automated)

```bash
cd deploy

export MONGO_URI="mongodb+srv://user:pass@cluster.mongodb.net/dbname"
npm run build --prefix ..
node scripts/deploy-lambda-infra.js
```

### Subsequent Code Updates (Fast)

```bash
cd deploy
node scripts/update-lambda-code.js
```

### Manual SAM Commands

You can also run SAM commands directly from `deploy/`:

```bash
cd deploy

# Build
npm run build --prefix ..
sam build --template sam-templates/template-lambda.yaml

# Deploy
sam deploy --config-file sam-configs/samconfig-lambda.toml --guided
```

### Get the API URL

```bash
aws cloudformation describe-stacks \
  --stack-name ami-api-lambda \
  --query 'Stacks[0].Outputs' \
  --output table
```

### View Lambda Logs

```bash
sam logs -n AmiFunction --tail --stack-name ami-api-lambda
```

### Delete the Stack

```bash
aws cloudformation delete-stack --stack-name ami-api-lambda
```

---

## Option 2: AWS Elastic Beanstalk

```bash
cd deploy

# Set environment variables
export AWS_REGION=us-east-1
export AWS_APP_NAME=financial-app-api
export AWS_ENVIRONMENT=production

# Build the project
npm run build --prefix ..

# Deploy
node scripts/deploy.js eb
```

Then set environment variables in the AWS Console:
- Elastic Beanstalk → Your Environment → Configuration → Software
- Add: `MONGO_URL`, `JWT_SECRET`, `PORT=8080`

---

## Option 3: AWS ECS with Fargate

```bash
# Build and push Docker image (from the API root)
cd ..
docker build -t financial-app-api:latest .

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=us-east-1

aws ecr create-repository --repository-name financial-app-api --region $AWS_REGION

aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

docker tag financial-app-api:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/financial-app-api:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/financial-app-api:latest

# Register task definition and create service
cd deploy
aws ecs create-cluster --cluster-name financial-app-cluster --region us-east-1
aws ecs register-task-definition --cli-input-json file://aws-config/ecs-task-definition.json
aws ecs create-service --cli-input-json file://aws-config/ecs-service.json
```

> Edit `aws-config/ecs-task-definition.json` and `aws-config/ecs-service.json` with your account ID, subnets, and security groups first.

---

## S3 + CloudFront (Frontend Hosting)

```bash
cd deploy

# Deploy S3 + CloudFront infrastructure
node scripts/deploy-s3-infra.js

# Upload frontend files to S3
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name ami-api-s3 \
  --query 'Stacks[0].Outputs[?OutputKey==`AmiWebBucketName`].OutputValue' \
  --output text)

aws s3 sync <frontend-dist-folder>/ s3://$BUCKET_NAME --delete

# Invalidate CloudFront cache
DIST_ID=$(aws cloudformation describe-stacks \
  --stack-name ami-api-s3 \
  --query 'Stacks[0].Outputs[?OutputKey==`AmiWebCloudFrontDistributionId`].OutputValue' \
  --output text)

aws cloudfront create-invalidation --distribution-id $DIST_ID --paths "/*"
```

---

## Local Development with Docker

```bash
cd deploy
docker compose up -d
```

This starts:
- **MongoDB** on port `27017` (user: `root`, password: `rootpassword`)
- **MySQL** on port `3306` (user: `user`, password: `user123`, database: `mydb`)

Connection string for local MongoDB:
```
mongodb://root:rootpassword@localhost:27017/financial-app?authSource=admin
```

Stop services:
```bash
docker compose down
```

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGO_URI` / `MONGO_URL` | MongoDB connection string | Yes |
| `JWT_SECRET` | Secret key for JWT token signing | Yes |
| `NODE_ENV` | Environment (`development` / `production`) | Yes |
| `PORT` | Server port (default: `3000`, EB: `8080`) | No |

### Lambda Local Testing

```bash
cd deploy

cp lambda-local/env.json.example lambda-local/env.json
# Edit env.json with your values

sam local invoke AmiFunction \
  --template sam-templates/template-lambda.yaml \
  --event lambda-local/event.json \
  --env-vars lambda-local/env.json
```

---

## Utility Scripts

All scripts run from `deploy/`:

```bash
cd deploy
```

| Script | Description | Command |
|--------|-------------|---------|
| Check prerequisites | Verify all tools are installed | `node scripts/check-prerequisites.js` |
| Deploy Lambda infra | Create/update Lambda stack | `node scripts/deploy-lambda-infra.js` |
| Update Lambda code | Fast code-only update | `node scripts/update-lambda-code.js` |
| Deploy S3 infra | Create/update S3/CloudFront stack | `node scripts/deploy-s3-infra.js` |
| Fix stuck stack | Fix CloudFormation stack issues | `node scripts/fix-stack.js [stack-name]` |
| Multi-target deploy | Deploy to EB, ECS, Lambda, or S3 | `node scripts/deploy.js <type>` |
| Check build | Verify fa-contracts installation | `bash scripts/check-build.sh` |
| Fix fa-contracts | Rebuild fa-contracts package | `bash scripts/fix-fa-contracts.sh` |

---

## Troubleshooting

### Lambda API doesn't respond
```bash
sam logs -n AmiFunction --tail --stack-name ami-api-lambda
```
Verify `MONGO_URI` is correctly configured in the Lambda environment.

### CloudFormation stack stuck in ROLLBACK_FAILED
```bash
cd deploy
node scripts/fix-stack.js ami-api-lambda
```

### CloudFront shows stale content
Create a cache invalidation (see [S3 + CloudFront](#s3--cloudfront-frontend-hosting) section). Wait 5-10 minutes for propagation.

### Elastic Beanstalk port mismatch
EB expects port `8080`, not `3000`. Set `PORT=8080` in EB environment variables.

### Build failures with fa-contracts
```bash
cd deploy
bash scripts/check-build.sh
bash scripts/fix-fa-contracts.sh
```

---

## Cost Estimation

| Service | Estimated Monthly Cost |
|---------|----------------------|
| Lambda + API Gateway | ~$0-5 (low traffic) |
| Elastic Beanstalk (t2.micro) | ~$30-50 |
| ECS Fargate (0.25 vCPU, 0.5GB) | ~$15-30 |
| S3 + CloudFront (frontend) | ~$1-5 |

*Prices are approximate and vary by region and usage.*

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy to AWS Lambda

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - uses: aws-actions/setup-sam@v2
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - run: npm ci
      - run: npm run build

      - name: Deploy via SAM
        working-directory: deploy
        run: |
          sam build --template sam-templates/template-lambda.yaml
          sam deploy --config-file sam-configs/samconfig-lambda.toml \
            --parameter-overrides MongoUri=${{ secrets.MONGO_URI }} \
            --no-confirm-changeset \
            --no-fail-on-empty-changeset
```

---

## Security Best Practices

1. **Never commit secrets** - Use AWS Secrets Manager or Parameter Store
2. **Use IAM roles** - Don't hardcode AWS credentials
3. **Enable HTTPS** - Use AWS Certificate Manager (ACM) for SSL
4. **Configure security groups** - Only allow necessary ports
5. **Use VPC** - Deploy in private subnets when possible
6. **Enable CloudWatch Logs** - Monitor your application
7. **Keep `env.json` out of version control** - Only commit `env.json.example`
