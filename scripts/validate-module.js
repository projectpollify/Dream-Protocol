#!/usr/bin/env node

/**
 * Module Standards Validation Script
 *
 * Validates that a module follows MODULE_STANDARDS.md requirements
 *
 * Usage: node scripts/validate-module.js <module-number>
 * Example: node scripts/validate-module.js 05
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFile(filePath, description) {
  if (fs.existsSync(filePath)) {
    log(`✓ ${description}`, 'green');
    return true;
  } else {
    log(`✗ ${description} - NOT FOUND`, 'red');
    return false;
  }
}

function validateModule(moduleNumber) {
  const moduleDir = path.join(__dirname, '..', 'packages', moduleNumber);

  if (!fs.existsSync(moduleDir)) {
    log(`\n❌ Module directory not found: ${moduleDir}\n`, 'red');
    process.exit(1);
  }

  const moduleName = path.basename(moduleDir).split('-').slice(1).join('-');

  log('\n═══════════════════════════════════════════════════════════', 'cyan');
  log(`   MODULE STANDARDS VALIDATION - Module ${moduleNumber}`, 'cyan');
  log('═══════════════════════════════════════════════════════════\n', 'cyan');

  let errors = 0;
  let warnings = 0;

  // ==============================================
  // 1. Package Structure
  // ==============================================
  log('📦 Package Structure', 'blue');

  if (!checkFile(path.join(moduleDir, 'package.json'), 'package.json exists')) errors++;
  if (!checkFile(path.join(moduleDir, 'tsconfig.json'), 'tsconfig.json exists')) errors++;
  if (!checkFile(path.join(moduleDir, 'src', 'index.ts'), 'src/index.ts exists')) errors++;
  if (!checkFile(path.join(moduleDir, 'src', 'utils', 'database.ts'), 'src/utils/database.ts exists')) errors++;

  // ==============================================
  // 2. Package.json Validation
  // ==============================================
  log('\n📝 package.json Validation', 'blue');

  const packageJsonPath = path.join(moduleDir, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    // Check package name
    if (packageJson.name && packageJson.name.startsWith('@dream/')) {
      log(`✓ Package name uses @dream/* namespace: ${packageJson.name}`, 'green');
    } else if (packageJson.name && packageJson.name.startsWith('@dream-protocol/')) {
      log(`✗ Package name uses WRONG namespace: ${packageJson.name}`, 'red');
      log(`  → Should be: @dream/${moduleName}`, 'yellow');
      errors++;
    } else {
      log(`✗ Package name invalid: ${packageJson.name}`, 'red');
      errors++;
    }

    // Check main field
    if (packageJson.main === 'dist/index.js') {
      log('✓ Main field points to dist/index.js', 'green');
    } else {
      log(`✗ Main field incorrect: ${packageJson.main}`, 'red');
      errors++;
    }

    // Check types field
    if (packageJson.types === 'dist/index.d.ts') {
      log('✓ Types field points to dist/index.d.ts', 'green');
    } else {
      log(`✗ Types field incorrect: ${packageJson.types}`, 'red');
      errors++;
    }

    // Check required scripts
    const requiredScripts = ['build', 'dev', 'test'];
    requiredScripts.forEach(script => {
      if (packageJson.scripts && packageJson.scripts[script]) {
        log(`✓ Script "${script}" exists`, 'green');
      } else {
        log(`✗ Script "${script}" missing`, 'red');
        errors++;
      }
    });
  }

  // ==============================================
  // 3. tsconfig.json Validation
  // ==============================================
  log('\n🔧 tsconfig.json Validation', 'blue');

  const tsconfigPath = path.join(moduleDir, 'tsconfig.json');
  if (fs.existsSync(tsconfigPath)) {
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));

    if (tsconfig.extends === '../../tsconfig.json') {
      log('✓ Extends root tsconfig.json', 'green');
    } else {
      log('✗ Does not extend root tsconfig.json', 'red');
      errors++;
    }

    const requiredOptions = {
      composite: true,
      declaration: true,
      declarationMap: true,
    };

    for (const [option, expectedValue] of Object.entries(requiredOptions)) {
      if (tsconfig.compilerOptions && tsconfig.compilerOptions[option] === expectedValue) {
        log(`✓ compilerOptions.${option} = ${expectedValue}`, 'green');
      } else {
        log(`✗ compilerOptions.${option} missing or incorrect`, 'red');
        errors++;
      }
    }
  }

  // ==============================================
  // 4. Database.ts Pattern Validation
  // ==============================================
  log('\n🗄️  database.ts Pattern Validation', 'blue');

  const databasePath = path.join(moduleDir, 'src', 'utils', 'database.ts');
  if (fs.existsSync(databasePath)) {
    const databaseContent = fs.readFileSync(databasePath, 'utf8');

    // Check for functional pattern (no classes)
    if (databaseContent.includes('class Database') || databaseContent.includes('export class Database')) {
      log('✗ database.ts uses CLASS pattern (should be FUNCTIONAL)', 'red');
      errors++;
    } else {
      log('✓ database.ts uses functional pattern (no classes)', 'green');
    }

    // Check for required exports
    const requiredExports = [
      'export const pool',
      'export async function query',
      'export async function transaction',
      'export async function findOne',
      'export async function findMany',
      'export async function insert',
      'export async function update',
    ];

    requiredExports.forEach(exportPattern => {
      if (databaseContent.includes(exportPattern)) {
        log(`✓ Exports ${exportPattern.replace('export ', '')}`, 'green');
      } else {
        log(`⚠ Missing ${exportPattern}`, 'yellow');
        warnings++;
      }
    });
  }

  // ==============================================
  // 5. Service Exports Validation
  // ==============================================
  log('\n⚙️  Service Exports Validation', 'blue');

  const servicesDir = path.join(moduleDir, 'src', 'services');
  if (fs.existsSync(servicesDir)) {
    const serviceFiles = fs.readdirSync(servicesDir).filter(f => f.endsWith('.service.ts'));

    if (serviceFiles.length === 0) {
      log('⚠ No service files found', 'yellow');
      warnings++;
    } else {
      log(`Found ${serviceFiles.length} service file(s)`, 'cyan');

      serviceFiles.forEach(serviceFile => {
        const servicePath = path.join(servicesDir, serviceFile);
        const serviceContent = fs.readFileSync(servicePath, 'utf8');

        // Check for default export pattern
        if (serviceContent.includes('export default')) {
          log(`✓ ${serviceFile} uses default export`, 'green');
        } else if (serviceContent.match(/export const \w+Service = new/)) {
          log(`✗ ${serviceFile} uses NAMED export (should be DEFAULT)`, 'red');
          errors++;
        } else {
          log(`⚠ ${serviceFile} export pattern unclear`, 'yellow');
          warnings++;
        }
      });
    }
  }

  // ==============================================
  // 6. Index.ts Hybrid Pattern Validation
  // ==============================================
  log('\n🔄 index.ts Hybrid Pattern Validation', 'blue');

  const indexPath = path.join(moduleDir, 'src', 'index.ts');
  if (fs.existsSync(indexPath)) {
    const indexContent = fs.readFileSync(indexPath, 'utf8');

    // Check for required exports
    if (indexContent.includes('export { default as')) {
      log('✓ Exports services with default imports', 'green');
    } else {
      log('✗ Missing service exports with default imports', 'red');
      errors++;
    }

    // Check for module initialization function
    if (indexContent.includes('export function initialize') || indexContent.includes('export async function initialize')) {
      log('✓ Has module initialization function', 'green');
    } else {
      log('✗ Missing module initialization function', 'red');
      errors++;
    }

    // Check for standalone server function
    if (indexContent.includes('export async function startStandaloneServer')) {
      log('✓ Has standalone server function', 'green');
    } else {
      log('✗ Missing standalone server function', 'red');
      errors++;
    }

    // Check for auto-run block
    if (indexContent.includes('if (require.main === module)')) {
      log('✓ Has auto-run block for standalone mode', 'green');
    } else {
      log('✗ Missing auto-run block', 'red');
      errors++;
    }
  }

  // ==============================================
  // 7. Summary
  // ==============================================
  log('\n═══════════════════════════════════════════════════════════', 'cyan');
  log('   VALIDATION SUMMARY', 'cyan');
  log('═══════════════════════════════════════════════════════════\n', 'cyan');

  if (errors === 0 && warnings === 0) {
    log('✅ Module PASSES all standards checks!', 'green');
    log('   Ready for integration and deployment.\n', 'green');
    process.exit(0);
  } else {
    if (errors > 0) {
      log(`❌ Found ${errors} ERROR(S) - Module does NOT meet standards`, 'red');
    }
    if (warnings > 0) {
      log(`⚠️  Found ${warnings} WARNING(S) - Review recommended`, 'yellow');
    }

    log('\n📖 Please review MODULE_STANDARDS.md and .claude/module-checklist.md', 'yellow');
    log('📁 Reference modules: packages/03-user or packages/04-economy\n', 'yellow');

    process.exit(errors > 0 ? 1 : 0);
  }
}

// ==============================================
// Main
// ==============================================

const args = process.argv.slice(2);

if (args.length === 0) {
  log('\n❌ Usage: node scripts/validate-module.js <module-number>', 'red');
  log('   Example: node scripts/validate-module.js 05\n', 'yellow');
  process.exit(1);
}

const moduleNumber = args[0];
validateModule(moduleNumber);
