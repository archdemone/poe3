#!/usr/bin/env ts-node

// Drop table audit script
import fs from 'fs';
import path from 'path';
import { auditDropTables, generateDropTableReport } from '../src/features/itemValidation/dropAudit.ts';

// Ensure reports directory exists
const reportsDir = path.join(process.cwd(), 'reports');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

async function main() {
  console.log('🚀 Starting drop table audit...\n');

  try {
    // Run audit
    const result = auditDropTables();

    // Generate markdown report
    const markdown = generateDropTableReport(result);
    const reportPath = path.join(reportsDir, 'drop-table-report.md');
    fs.writeFileSync(reportPath, markdown);

    console.log(`\n📊 Report generated: ${reportPath}`);
    console.log(`📈 Summary:`);
    console.log(`   • Total items: ${result.totalItems}`);
    console.log(`   • Items accessible: ${result.itemsAccessibleAtAnyLevel}`);
    console.log(`   • Accessibility: ${result.summary.accessibility.toFixed(1)}%`);
    console.log(`   • Inaccessible items: ${result.summary.orphanedItems}`);
    console.log(`   • Level issues: ${result.summary.levelIssues}`);

  } catch (error) {
    console.error('💥 Audit failed with exception:', error);
    process.exit(1);
  }
}

main().catch(console.error);
