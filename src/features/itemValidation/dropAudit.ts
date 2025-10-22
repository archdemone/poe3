// Drop table auditor - validates item availability in drop tables
import fs from 'fs';
import path from 'path';
import type { ItemBase } from '../schemas.js';

interface DropTableAuditResult {
  timestamp: string;
  totalItems: number;
  itemsAccessibleAtAnyLevel: number;
  itemsNeverAccessible: Array<{
    id: string;
    name: string;
    class?: string;
    level?: number;
  }>;
  levelGatingIssues: Array<{
    id: string;
    name: string;
    issue: string;
  }>;
  summary: {
    accessibility: number; // percentage of items accessible at some level
    orphanedItems: number;
    levelIssues: number;
  };
}

// Load all item bases
function loadAllItemBases(): ItemBase[] {
  const allItems: ItemBase[] = [];
  const itemFiles = [
    'bases_amulets.json',
    'bases_belts.json',
    'bases_boots.json',
    'bases_bows.json',
    'bases_chest_armor.json',
    'bases_currency.json',
    'bases_flasks.json',
    'bases_gloves.json',
    'bases_helmets.json',
    'bases_one_hand_swords.json',
    'bases_rings.json',
    'bases_socketables.json',
  ];

  for (const file of itemFiles) {
    const filePath = path.join('data', 'items', file);
    if (fs.existsSync(filePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        allItems.push(...data);
      } catch (error) {
        // Skip invalid files
      }
    }
  }

  return allItems;
}

// Simulate testing item accessibility by checking level requirements
function testItemAccessibility(allItems: ItemBase[]): {
  accessibleItems: Set<string>;
  inaccessibleItems: Array<{
    id: string;
    name: string;
    class?: string;
    level?: number;
    reason: string;
  }>;
} {
  const accessibleItems = new Set<string>();
  const inaccessibleItems: Array<{
    id: string;
    name: string;
    class?: string;
    level?: number;
    reason: string;
  }> = [];

  // Test accessibility at different levels (1-100)
  for (let level = 1; level <= 100; level++) {
    for (const item of allItems) {
      if (!accessibleItems.has(item.id)) {
        const reqLevel = item.req?.level || 0;
        // Items are accessible if player level >= item level requirement
        // (simplified - actual logic in getBasePool uses level + 5)
        if (level >= reqLevel) {
          accessibleItems.add(item.id);
        }
      }
    }
  }

  // Find items that are never accessible (have impossible level requirements)
  for (const item of allItems) {
    if (!accessibleItems.has(item.id)) {
      const reqLevel = item.req?.level || 0;
      inaccessibleItems.push({
        id: item.id,
        name: item.name,
        class: item.class,
        level: reqLevel,
        reason: `Level requirement ${reqLevel} is too high (max player level is 100)`,
      });
    }
  }

  return { accessibleItems, inaccessibleItems };
}

// Main audit function
export function auditDropTables(): DropTableAuditResult {
  const timestamp = new Date().toISOString();

  console.log('🔍 Auditing drop tables...');

  // Load all item bases
  const allItems = loadAllItemBases();
  console.log(`  📦 Loaded ${allItems.length} item bases`);

  // Test item accessibility
  const { accessibleItems, inaccessibleItems } = testItemAccessibility(allItems);
  console.log(`  ✅ ${accessibleItems.size} items are accessible at some level`);
  console.log(`  ❌ ${inaccessibleItems.length} items are never accessible`);

  // Check level gating issues
  const levelGatingIssues: Array<{
    id: string;
    name: string;
    issue: string;
  }> = [];

  for (const item of allItems) {
    if (item.req?.level) {
      // Check if level requirement makes sense
      if (item.req.level > 100) {
        levelGatingIssues.push({
          id: item.id,
          name: item.name,
          issue: `Level requirement ${item.req.level} exceeds maximum player level (100)`,
        });
      } else if (item.req.level < 0) {
        levelGatingIssues.push({
          id: item.id,
          name: item.name,
          issue: `Level requirement ${item.req.level} is negative`,
        });
      }
    }
  }

  // Calculate summary
  const totalItems = allItems.length;
  const accessibility = totalItems > 0 ? (accessibleItems.size / totalItems) * 100 : 0;

  return {
    timestamp,
    totalItems,
    itemsAccessibleAtAnyLevel: accessibleItems.size,
    itemsNeverAccessible: inaccessibleItems,
    levelGatingIssues,
    summary: {
      accessibility,
      orphanedItems: inaccessibleItems.length,
      levelIssues: levelGatingIssues.length,
    },
  };
}

// Generate markdown report
export function generateDropTableReport(result: DropTableAuditResult): string {
  let markdown = `# Drop Table Audit Report\n\n`;
  markdown += `**Generated:** ${result.timestamp}\n\n`;

  markdown += `## Summary\n\n`;
  markdown += `- **Total Items:** ${result.totalItems}\n`;
  markdown += `- **Items Accessible:** ${result.itemsAccessibleAtAnyLevel}\n`;
  markdown += `- **Accessibility:** ${result.summary.accessibility.toFixed(1)}%\n`;
  markdown += `- **Inaccessible Items:** ${result.summary.orphanedItems}\n`;
  markdown += `- **Level Gating Issues:** ${result.summary.levelIssues}\n\n`;

  if (result.itemsNeverAccessible.length > 0) {
    markdown += `## Items Never Accessible\n\n`;
    markdown += `| ID | Name | Class | Level | Reason |\n`;
    markdown += `|----|------|-------|-------|--------|\n`;

    for (const item of result.itemsNeverAccessible) {
      markdown += `| ${item.id} | ${item.name} | ${item.class || 'N/A'} | ${item.level || 'N/A'} | ${item.reason} |\n`;
    }
    markdown += `\n`;
  }

  if (result.levelGatingIssues.length > 0) {
    markdown += `## Level Gating Issues\n\n`;
    for (const issue of result.levelGatingIssues) {
      markdown += `- **${issue.name} (${issue.id}):** ${issue.issue}\n`;
    }
    markdown += `\n`;
  }

  return markdown;
}
