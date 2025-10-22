#!/usr/bin/env ts-node

// Item validation CLI script
import fs from 'fs';
import path from 'path';
import { validateAllItems, generateMarkdownReport } from '../src/features/itemValidation/validateItems.ts';

// Ensure reports directory exists
const reportsDir = path.join(process.cwd(), 'reports');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

async function main() {
  console.log('🚀 Starting item validation...\n');

  try {
    // Run validation
    const report = validateAllItems();

    // Generate markdown report
    const markdown = generateMarkdownReport(report);
    const reportPath = path.join(reportsDir, 'item-data-report.md');
    fs.writeFileSync(reportPath, markdown);

    console.log(`\n📊 Report generated: ${reportPath}`);
    console.log(`📈 Summary:`);
    console.log(`   • Total items: ${report.totalItems}`);
    console.log(`   • Valid items: ${report.summary.validItems}`);
    console.log(`   • Errors: ${report.errors.length}`);
    console.log(`   • Warnings: ${report.warnings.length}`);

    // Exit with error code if there are validation errors
    if (report.errors.length > 0) {
      console.log('\n❌ Validation failed due to errors. Check the report for details.');
      process.exit(1);
    } else if (report.warnings.length > 0) {
      console.log('\n⚠️  Validation passed with warnings. Check the report for details.');
      process.exit(0);
    } else {
      console.log('\n✅ All validations passed!');
      process.exit(0);
    }

  } catch (error) {
    console.error('💥 Validation failed with exception:', error);
    process.exit(1);
  }
}

main().catch(console.error);
