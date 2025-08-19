#!/usr/bin/env node

/**
 * Test Validation Script
 * 
 * This script validates the test setup and configuration without requiring
 * Playwright browsers to be installed. It checks:
 * - Test file syntax and structure
 * - Playwright configuration
 * - Package.json scripts
 * - GitHub Actions workflow
 */

const fs = require('fs');
const path = require('path');

const webDir = path.join(__dirname);
const testDir = path.join(webDir, 'tests');

console.log('🧪 FIA Web Frontend Test Validation\n');

// Check if test files exist and are valid
const testFiles = [
  'homepage.spec.ts',
  'token.spec.ts', 
  'leaderboard.spec.ts',
  'monitor.spec.ts',
  'other-pages.spec.ts',
  'integration.spec.ts'
];

let allTestsValid = true;

console.log('📁 Checking test files...');
testFiles.forEach(file => {
  const filePath = path.join(testDir, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Basic syntax checks
    const hasImports = content.includes("import { test, expect } from '@playwright/test'");
    const hasDescribe = content.includes('test.describe(');
    const hasTests = content.includes('test(');
    
    if (hasImports && hasDescribe && hasTests) {
      console.log(`  ✅ ${file} - Valid`);
    } else {
      console.log(`  ❌ ${file} - Invalid structure`);
      allTestsValid = false;
    }
  } else {
    console.log(`  ❌ ${file} - Missing`);
    allTestsValid = false;
  }
});

// Check Playwright config
console.log('\n⚙️  Checking Playwright configuration...');
const playwrightConfigPath = path.join(webDir, 'playwright.config.ts');
if (fs.existsSync(playwrightConfigPath)) {
  const config = fs.readFileSync(playwrightConfigPath, 'utf8');
  const hasProjects = config.includes('projects:');
  const hasWebServer = config.includes('webServer:');
  
  if (hasProjects && hasWebServer) {
    console.log('  ✅ playwright.config.ts - Valid');
  } else {
    console.log('  ❌ playwright.config.ts - Missing required sections');
    allTestsValid = false;
  }
} else {
  console.log('  ❌ playwright.config.ts - Missing');
  allTestsValid = false;
}

// Check package.json scripts
console.log('\n📦 Checking package.json scripts...');
const packageJsonPath = path.join(webDir, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const scripts = packageJson.scripts || {};
  
  const requiredScripts = ['test:e2e', 'test:e2e:headed', 'test:e2e:report'];
  let scriptsValid = true;
  
  requiredScripts.forEach(script => {
    if (scripts[script]) {
      console.log(`  ✅ ${script} - Present`);
    } else {
      console.log(`  ❌ ${script} - Missing`);
      scriptsValid = false;
    }
  });
  
  if (!scriptsValid) allTestsValid = false;
} else {
  console.log('  ❌ package.json - Missing');
  allTestsValid = false;
}

// Check GitHub Actions workflow
console.log('\n🔄 Checking GitHub Actions workflow...');
const workflowPath = path.join(__dirname, '..', '.github', 'workflows', 'web-tests.yml');
if (fs.existsSync(workflowPath)) {
  const workflow = fs.readFileSync(workflowPath, 'utf8');
  const hasE2EJob = workflow.includes('e2e-tests:');
  const hasPlaywright = workflow.includes('playwright');
  
  if (hasE2EJob && hasPlaywright) {
    console.log('  ✅ web-tests.yml - Valid');
  } else {
    console.log('  ❌ web-tests.yml - Missing required sections');
    allTestsValid = false;
  }
} else {
  console.log('  ❌ web-tests.yml - Missing');
  allTestsValid = false;
}

// Check WEBTEST.md documentation
console.log('\n📚 Checking test documentation...');
const webtestPath = path.join(__dirname, '..', 'WEBTEST.md');
if (fs.existsSync(webtestPath)) {
  const webtest = fs.readFileSync(webtestPath, 'utf8');
  const hasTestCases = webtest.includes('Test Case');
  const hasAutomationStatus = webtest.includes('AUTOMATED') || webtest.includes('MANUAL');
  
  if (hasTestCases && hasAutomationStatus) {
    console.log('  ✅ WEBTEST.md - Complete');
  } else {
    console.log('  ❌ WEBTEST.md - Incomplete');
    allTestsValid = false;
  }
} else {
  console.log('  ❌ WEBTEST.md - Missing');
  allTestsValid = false;
}

// Summary
console.log('\n' + '='.repeat(50));
if (allTestsValid) {
  console.log('🎉 All test validations passed!');
  console.log('\nNext steps:');
  console.log('1. Install Playwright browsers: npx playwright install');
  console.log('2. Start dev server: npm run dev');
  console.log('3. Run tests: npm run test:e2e');
  process.exit(0);
} else {
  console.log('❌ Some test validations failed!');
  console.log('Please fix the issues above before running tests.');
  process.exit(1);
}