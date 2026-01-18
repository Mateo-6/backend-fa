const { execSync } = require('child_process');

/**
 * Fixes a stuck CloudFormation stack by continuing rollback or deleting it
 * 
 * @param {string} stackName - CloudFormation stack name
 * @param {string} region - AWS region
 * @param {string} profile - AWS profile (optional)
 * @returns {Promise<void>} Resolves when stack is fixed or deleted
 */
async function fixStack(stackName, region, profile) {
  const profileArg = profile ? `--profile ${profile}` : '';
  
  console.log(`🔧 Checking stack status: ${stackName}...`);
  
  try {
    const status = execSync(
      `aws cloudformation describe-stacks --stack-name ${stackName} --region ${region} ${profileArg} --query "Stacks[0].StackStatus" --output text`,
      { encoding: 'utf-8', stdio: 'pipe' }
    ).trim();
    
    console.log(`📋 Current stack status: ${status}`);
    
    if (status === 'UPDATE_ROLLBACK_FAILED' || status === 'UPDATE_FAILED') {
      console.log('\n⚠️  Stack is in a failed state. Attempting to continue rollback...');
      
      // Get failed resources
      const failedResources = execSync(
        `aws cloudformation describe-stack-resources --stack-name ${stackName} --region ${region} ${profileArg} --query "StackResources[?ResourceStatus=='UPDATE_ROLLBACK_FAILED' || ResourceStatus=='CREATE_FAILED'].LogicalResourceId" --output text`,
        { encoding: 'utf-8', stdio: 'pipe' }
      ).trim().split('\t').filter(Boolean);
      
      if (failedResources.length > 0) {
        console.log(`📦 Found ${failedResources.length} failed resource(s): ${failedResources.join(', ')}`);
        console.log('🔄 Continuing rollback while skipping failed resources...');
        
        execSync(
          `aws cloudformation continue-update-rollback --stack-name ${stackName} --region ${region} ${profileArg} --resources-to-skip ${failedResources.join(' ')}`,
          { stdio: 'inherit' }
        );
        
        console.log('⏳ Waiting for rollback to complete (this may take a few minutes)...');
        // Wait and check status
        for (let i = 0; i < 30; i++) {
          await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
          try {
            const newStatus = execSync(
              `aws cloudformation describe-stacks --stack-name ${stackName} --region ${region} ${profileArg} --query "Stacks[0].StackStatus" --output text`,
              { encoding: 'utf-8', stdio: 'pipe' }
            ).trim();
            
            console.log(`   Status: ${newStatus}`);
            
            if (!newStatus.includes('FAILED') && !newStatus.includes('ROLLBACK')) {
              console.log(`✅ Stack is now in state: ${newStatus}`);
              return;
            }
          } catch (error) {
            // Stack might have been deleted
            console.log('✅ Stack appears to have been deleted or resolved');
            return;
          }
        }
        
        console.log('⚠️  Rollback is taking longer than expected. You may need to delete the stack manually.');
      } else {
        console.log('❌ Could not identify failed resources. Deleting stack...');
        execSync(
          `aws cloudformation delete-stack --stack-name ${stackName} --region ${region} ${profileArg}`,
          { stdio: 'inherit' }
        );
        console.log('✅ Stack deletion initiated. Wait for deletion to complete before redeploying.');
      }
    } else if (status.includes('DELETE')) {
      console.log('⏳ Stack is being deleted. Please wait for deletion to complete.');
    } else {
      console.log(`✅ Stack status is: ${status} (no fix needed)`);
    }
  } catch (error) {
    if (error.message.includes('does not exist')) {
      console.log('✅ Stack does not exist. You can deploy a new one.');
    } else {
      console.error('❌ Error:', error.message);
      throw error;
    }
  }
}

// Main execution
const stackName = process.argv[2] || process.env.AWS_STACK_NAME || 'ami-api-lambda';
const region = process.env.AWS_REGION || 'us-east-1';
const profile = process.env.AWS_PROFILE;

fixStack(stackName, region, profile).catch((error) => {
  console.error('❌ Error fixing stack:', error);
  process.exit(1);
});
