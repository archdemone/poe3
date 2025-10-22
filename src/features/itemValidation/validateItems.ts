// Item data validation system
import fs from 'fs';
import path from 'path';

import { z } from 'zod';

import {
  ItemBaseSchema,
  AffixDefinitionSchema,
  UniqueDefSchema,
  ItemInstanceSchema,
  DropTableEntrySchema,
  type ItemBase,
  type AffixDefinition,
  type UniqueDef,
  type ItemInstance,
  type DropTableEntry,
} from './schemas.ts';

// Validation result types
export interface ValidationError {
  file: string;
  path: string;
  message: string;
  value?: any;
}

export interface ValidationWarning {
  file: string;
  message: string;
  suggestion?: string;
}

export interface ValidationReport {
  timestamp: string;
  totalFiles: number;
  totalItems: number;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  summary: {
    validItems: number;
    invalidItems: number;
    missingStats: string[];
    duplicateIds: string[];
    referentialIssues: string[];
  };
}

// Load and parse JSON files
function loadJsonFile<T>(filePath: string, schema: z.ZodSchema<T>): T | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    const result = schema.safeParse(data);
    if (result.success) {
      return result.data;
    } else {
      return null;
    }
  } catch (error) {
    return null;
  }
}

// Load array of items from JSON file
function loadJsonArrayFile<T>(filePath: string, schema: z.ZodSchema<T>): T[] {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    if (!Array.isArray(data)) return [];

    const validItems: T[] = [];
    for (const item of data) {
      const result = schema.safeParse(item);
      if (result.success) {
        validItems.push(result.data);
      }
    }
    return validItems;
  } catch (error) {
    return [];
  }
}

// Validate item bases
function validateItemBases(): { items: ItemBase[]; errors: ValidationError[]; itemCount: number } {
  const errors: ValidationError[] = [];
  const items: ItemBase[] = [];
  let itemCount = 0;

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
    if (!fs.existsSync(filePath)) {
      errors.push({
        file,
        path: '',
        message: `File not found: ${filePath}`,
      });
      continue;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);

      if (!Array.isArray(data)) {
        errors.push({
          file,
          path: '',
          message: 'Expected array of items',
        });
        continue;
      }

      for (let i = 0; i < data.length; i++) {
        itemCount++;
        const result = ItemBaseSchema.safeParse(data[i]);
        if (!result.success) {
          for (const issue of result.error.issues) {
            errors.push({
              file,
              path: `[${i}].${issue.path.join('.')}`,
              message: issue.message,
              value: issue.code === 'invalid_type' ? data[i][issue.path[0]] : undefined,
            });
          }
        } else {
          items.push(result.data);
        }
      }
    } catch (error) {
      errors.push({
        file,
        path: '',
        message: `Failed to parse JSON: ${error}`,
      });
    }
  }

  return { items, errors, itemCount };
}

// Validate affixes
function validateAffixes(): { prefixes: AffixDefinition[]; suffixes: AffixDefinition[]; errors: ValidationError[] } {
  const errors: ValidationError[] = [];

  const prefixes = loadJsonArrayFile(path.join('data', 'affixes', 'prefixes.json'), AffixDefinitionSchema);
  const suffixes = loadJsonArrayFile(path.join('data', 'affixes', 'suffixes.json'), AffixDefinitionSchema);

  // Validate that all stat keys in affixes are known equippable stats
  const knownEquippableStats = new Set([
    'str', 'dex', 'int', 'hp_flat', 'mp_flat', 'hp_regen', 'mp_regen',
    'melee_pct', 'bow_pct', 'phys_damage_pct', 'armor', 'evasion',
    'fire_res', 'cold_res', 'lightning_res', 'aps_pct', 'crit_chance',
    'spell_damage_pct', 'cast_speed_pct', 'spell_crit_chance',
    'lightning_damage_pct', 'cold_damage_pct', 'chaos_damage_pct',
    'life_gain_per_kill', 'all_attributes', 'lightning_damage_flat',
    'life_leech_pct', 'gold_find_pct', 'minion_damage_pct',
    'bleed_chance', 'poison_chance', 'fire_damage_pct'
  ]);

  for (const prefix of prefixes) {
    if (!knownEquippableStats.has(prefix.stat)) {
      errors.push({
        file: 'prefixes.json',
        path: `prefixes[${prefixes.indexOf(prefix)}].stat`,
        message: `Unknown equippable stat key: ${prefix.stat}`,
      });
    }
  }

  for (const suffix of suffixes) {
    if (!knownEquippableStats.has(suffix.stat)) {
      errors.push({
        file: 'suffixes.json',
        path: `suffixes[${suffixes.indexOf(suffix)}].stat`,
        message: `Unknown equippable stat key: ${suffix.stat}`,
      });
    }
  }

  return { prefixes, suffixes, errors };
}

// Validate uniques
function validateUniques(): { uniques: UniqueDef[]; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  const uniques = loadJsonArrayFile(path.join('data', 'items', 'uniques.json'), UniqueDefSchema);
  return { uniques, errors };
}

// Validate referential integrity
function validateReferentialIntegrity(
  itemBases: ItemBase[],
  uniques: UniqueDef[],
  warnings: ValidationWarning[]
): void {
  const baseIds = new Set(itemBases.map(item => item.id));

  // Check unique baseId references
  for (const unique of uniques) {
    if (!baseIds.has(unique.baseId)) {
      warnings.push({
        file: 'uniques.json',
        message: `Unique "${unique.name}" references unknown baseId: ${unique.baseId}`,
        suggestion: 'Check that the base item exists in the bases files',
      });
    }
  }

  // Note: We don't validate implicit stats on base items or uniques as they don't need to be equippable.
  // Only affix stats need to be equippable bonuses.
}

// Check for duplicates and value ranges
function validateDataQuality(
  itemBases: ItemBase[],
  warnings: ValidationWarning[]
): void {
  const ids = new Set<string>();
  const names = new Set<string>();

  for (const item of itemBases) {
    // Check for duplicate IDs
    if (ids.has(item.id)) {
      warnings.push({
        file: 'multiple files',
        message: `Duplicate item ID: ${item.id}`,
      });
    }
    ids.add(item.id);

    // Check for duplicate names (within same class)
    const nameKey = `${item.class || 'unknown'}:${item.name}`;
    if (names.has(nameKey)) {
      warnings.push({
        file: 'multiple files',
        message: `Duplicate item name within class: ${item.name} (${item.class || 'unknown'})`,
      });
    }
    names.add(nameKey);

    // Check value ranges
    if (item.req) {
      if (item.req.str && (item.req.str < 0 || item.req.str > 500)) {
        warnings.push({
          file: `${item.class || 'unknown'}.json`,
          message: `Item "${item.name}" has invalid str requirement: ${item.req.str}`,
        });
      }
      if (item.req.dex && (item.req.dex < 0 || item.req.dex > 500)) {
        warnings.push({
          file: `${item.class || 'unknown'}.json`,
          message: `Item "${item.name}" has invalid dex requirement: ${item.req.dex}`,
        });
      }
      if (item.req.int && (item.req.int < 0 || item.req.int > 500)) {
        warnings.push({
          file: `${item.class || 'unknown'}.json`,
          message: `Item "${item.name}" has invalid int requirement: ${item.req.int}`,
        });
      }
    }

    // Check flask values - allow higher values for mana regeneration
    if (item.flask) {
      for (const effect of item.flask.effect) {
        if (!Array.isArray(effect.value) && (effect.value < -500 || effect.value > 1500)) {
          warnings.push({
            file: `${item.class || 'unknown'}.json`,
            message: `Flask "${item.name}" has extreme effect value: ${effect.value}`,
          });
        }
      }
    }
  }
}

// Main validation function
export function validateAllItems(): ValidationReport {
  const timestamp = new Date().toISOString();
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  console.log('🔍 Validating item data...');

  // Validate bases
  console.log('  📁 Validating item bases...');
  const { items: itemBases, errors: baseErrors, itemCount: baseItemCount } = validateItemBases();
  errors.push(...baseErrors);

  // Validate affixes
  console.log('  📁 Validating affixes...');
  const { errors: affixErrors } = validateAffixes();
  errors.push(...affixErrors);

  // Validate uniques
  console.log('  📁 Validating uniques...');
  const { uniques, errors: uniqueErrors } = validateUniques();
  errors.push(...uniqueErrors);

  // Cross-validation
  console.log('  🔗 Checking referential integrity...');
  validateReferentialIntegrity(itemBases, uniques, warnings);

  console.log('  ✅ Checking data quality...');
  validateDataQuality(itemBases, warnings);

  // Generate summary - count items that passed validation, not total errors
  const totalItems = baseItemCount + uniques.length;
  const validItems = itemBases.length + uniques.length;
  const invalidItems = totalItems - validItems;

  const missingStats: string[] = [];
  const duplicateIds: string[] = [];
  const referentialIssues: string[] = [];

  for (const warning of warnings) {
    if (warning.message.includes('unknown stat')) {
      missingStats.push(warning.message);
    } else if (warning.message.includes('Duplicate item ID')) {
      duplicateIds.push(warning.message);
    } else if (warning.message.includes('references unknown') || warning.message.includes('unknown implicit stat')) {
      referentialIssues.push(warning.message);
    }
  }

  return {
    timestamp,
    totalFiles: 14, // Estimated count
    totalItems,
    errors,
    warnings,
    summary: {
      validItems,
      invalidItems,
      missingStats,
      duplicateIds,
      referentialIssues,
    },
  };
}

// Generate markdown report
export function generateMarkdownReport(report: ValidationReport): string {
  let markdown = `# Item Data Validation Report\n\n`;
  markdown += `**Generated:** ${report.timestamp}\n\n`;

  markdown += `## Summary\n\n`;
  markdown += `- **Total Items:** ${report.totalItems}\n`;
  markdown += `- **Valid Items:** ${report.summary.validItems}\n`;
  markdown += `- **Invalid Items:** ${report.summary.invalidItems}\n`;
  markdown += `- **Errors:** ${report.errors.length}\n`;
  markdown += `- **Warnings:** ${report.warnings.length}\n\n`;

  if (report.errors.length > 0) {
    markdown += `## Errors\n\n`;
    markdown += `| File | Path | Message | Value |\n`;
    markdown += `|------|------|---------|-------|\n`;

    for (const error of report.errors) {
      markdown += `| ${error.file} | ${error.path} | ${error.message} | ${error.value || ''} |\n`;
    }
    markdown += `\n`;
  }

  if (report.warnings.length > 0) {
    markdown += `## Warnings\n\n`;
    for (const warning of report.warnings) {
      markdown += `- **${warning.file}:** ${warning.message}\n`;
      if (warning.suggestion) {
        markdown += `  - *Suggestion:* ${warning.suggestion}\n`;
      }
    }
    markdown += `\n`;
  }

  if (report.summary.missingStats.length > 0) {
    markdown += `## Missing Stat Keys\n\n`;
    for (const stat of report.summary.missingStats) {
      markdown += `- ${stat}\n`;
    }
    markdown += `\n`;
  }

  if (report.summary.duplicateIds.length > 0) {
    markdown += `## Duplicate IDs\n\n`;
    for (const dup of report.summary.duplicateIds) {
      markdown += `- ${dup}\n`;
    }
    markdown += `\n`;
  }

  if (report.summary.referentialIssues.length > 0) {
    markdown += `## Referential Issues\n\n`;
    for (const issue of report.summary.referentialIssues) {
      markdown += `- ${issue}\n`;
    }
    markdown += `\n`;
  }

  return markdown;
}
