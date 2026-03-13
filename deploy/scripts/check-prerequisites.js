const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DEPLOY_DIR = path.resolve(__dirname, '..');
const PROJECT_ROOT = path.resolve(DEPLOY_DIR, '..');

/**
 * Checks if all prerequisites for AWS deployment are met.
 * All paths are resolved relative to the deploy/ folder.
 * 
 * @returns {Promise<void>} Resolves when all checks complete
 */
async function checkPrerequisites() {
  console.log('🔍 Checking prerequisites for AWS deployment...');
  console.log(`📂 Project Root: ${PROJECT_ROOT}\n`);
  
  const checks = [];
  
  try {
    const nodeVersion = execSync('node --version', { encoding: 'utf-8' }).trim();
    console.log(`✅ Node.js: ${nodeVersion}`);
    checks.push({ name: 'Node.js', status: true });
  } catch (error) {
    console.log('❌ Node.js: Not installed');
    checks.push({ name: 'Node.js', status: false });
  }
  
  try {
    const npmVersion = execSync('npm --version', { encoding: 'utf-8' }).trim();
    console.log(`✅ npm: ${npmVersion}`);
    checks.push({ name: 'npm', status: true });
  } catch (error) {
    console.log('❌ npm: Not installed');
    checks.push({ name: 'npm', status: false });
  }
  
  try {
    const awsVersion = execSync('aws --version', { encoding: 'utf-8' }).trim();
    console.log(`✅ AWS CLI: ${awsVersion}`);
    checks.push({ name: 'AWS CLI', status: true });
  } catch (error) {
    console.log('❌ AWS CLI: Not installed');
    console.log('   Install: https://aws.amazon.com/cli/');
    checks.push({ name: 'AWS CLI', status: false });
  }
  
  try {
    const samVersion = execSync('sam --version', { encoding: 'utf-8' }).trim();
    console.log(`✅ SAM CLI: ${samVersion}`);
    checks.push({ name: 'SAM CLI', status: true });
  } catch (error) {
    console.log('❌ SAM CLI: Not installed');
    console.log('   Install: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html');
    checks.push({ name: 'SAM CLI', status: false });
  }
  
  try {
    execSync('aws sts get-caller-identity', { stdio: 'ignore' });
    const identity = JSON.parse(execSync('aws sts get-caller-identity', { encoding: 'utf-8' }));
    console.log(`✅ AWS Credentials: Configured (Account: ${identity.Account})`);
    checks.push({ name: 'AWS Credentials', status: true });
  } catch (error) {
    console.log('❌ AWS Credentials: Not configured');
    console.log('   Run: aws configure');
    checks.push({ name: 'AWS Credentials', status: false });
  }
  
  try {
    const dockerVersion = execSync('docker --version', { encoding: 'utf-8' }).trim();
    console.log(`✅ Docker: ${dockerVersion}`);
    checks.push({ name: 'Docker', status: true });
  } catch (error) {
    console.log('⚠️  Docker: Not installed (required for ECS deployment)');
    checks.push({ name: 'Docker', status: false });
  }
  
  const distPath = path.join(PROJECT_ROOT, 'dist');
  if (fs.existsSync(distPath)) {
    console.log('✅ Build directory: dist/ exists');
    checks.push({ name: 'Build directory', status: true });
  } else {
    console.log('⚠️  Build directory: dist/ not found (run "npm run build" from project root)');
    checks.push({ name: 'Build directory', status: false });
  }
  
  const packageJsonPath = path.join(PROJECT_ROOT, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    console.log('✅ package.json: Exists');
    checks.push({ name: 'package.json', status: true });
  } else {
    console.log('❌ package.json: Not found');
    checks.push({ name: 'package.json', status: false });
  }
  
  console.log('\n📊 Summary:');
  const passed = checks.filter(c => c.status).length;
  const total = checks.length;
  const critical = ['Node.js', 'npm', 'AWS CLI', 'SAM CLI', 'AWS Credentials', 'package.json'];
  const criticalFailed = checks.filter(c => critical.includes(c.name) && !c.status);
  
  if (criticalFailed.length > 0) {
    console.log(`❌ ${passed}/${total} checks passed`);
    console.log('\n⚠️  Critical prerequisites missing:');
    criticalFailed.forEach(c => console.log(`   - ${c.name}`));
    process.exit(1);
  } else {
    console.log(`✅ ${passed}/${total} checks passed`);
    console.log('\n🎉 All critical prerequisites are met!');
    if (passed < total) {
      console.log('\n💡 Optional prerequisites missing (for specific deployment types):');
      checks.filter(c => !c.status && !critical.includes(c.name)).forEach(c => {
        console.log(`   - ${c.name}`);
      });
    }
  }
}

checkPrerequisites().catch((error) => {
  console.error('❌ Error checking prerequisites:', error);
  process.exit(1);
});
