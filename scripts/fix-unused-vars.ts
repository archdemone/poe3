#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

// Read the typecheck output and extract unused variable errors
async function fixUnusedVars() {
  try {
    const output = fs.readFileSync('typecheck_output.txt', 'utf8').replace(/\r\n/g, '\n');
    const lines = output.split('\n');

    console.log('Total lines in file:', lines.length);
    console.log('First 10 lines:');
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      console.log(`${i}: ${lines[i]}`);
    }

    const unusedVarErrors: Array<{file: string, line: number, varName: string, type: 'param' | 'var' | 'import'}> = [];

    for (const line of lines) {
      // Match patterns like:
      // src/file.ts(123,45): error TS6133: 'varName' is declared but its value is never read.
      // src/file.ts(123,45): error TS6196: 'varName' is declared but never used.
      if (line.includes('error TS61')) {
        console.log('Processing line:', line);
        const match = line.match(/(.+)\((\d+),\d+\): error TS61\d\d: '([^']+)' is (?:declared but (?:its value is )?never (?:used|read)|assigned a value but never used|defined but never used)/);
        if (match) {
          const [, filePath, lineNum, varName] = match;
          const type = line.includes('parameter') ? 'param' : (line.includes('import') ? 'import' : 'var');
          unusedVarErrors.push({
            file: filePath,
            line: parseInt(lineNum),
            varName,
            type
          });
        } else {
          console.log('No match for line:', line);
        }
      }
    }

    console.log(`Found ${unusedVarErrors.length} unused variables to fix`);

    // Group by file
    const fileGroups = unusedVarErrors.reduce((acc, error) => {
      if (!acc[error.file]) acc[error.file] = [];
      acc[error.file].push(error);
      return acc;
    }, {} as Record<string, typeof unusedVarErrors>);

    // Process each file
    for (const [filePath, errors] of Object.entries(fileGroups)) {
      if (!fs.existsSync(filePath)) continue;

      let content = fs.readFileSync(filePath, 'utf8');
      let modified = false;

      // Process errors in reverse line order to avoid offset issues
      errors.sort((a, b) => b.line - a.line);

      for (const error of errors) {
        // Skip if already prefixed with _
        if (error.varName.startsWith('_')) continue;

        // Find the variable declaration and prefix with _
        const lines = content.split('\n');
        const lineIndex = error.line - 1; // Convert to 0-based

        if (lineIndex >= 0 && lineIndex < lines.length) {
          const line = lines[lineIndex];

          // Handle different types of declarations
          let replacement: RegExp | null = null;

          if (error.type === 'import') {
            // import { varName, ... } from 'module'
            replacement = new RegExp(`\\b${error.varName}\\b(?=\\s*(?:,|\\}|[\\s\\w]*as))`, 'g');
          } else if (error.type === 'param') {
            // function(param) or (param) =>
            replacement = new RegExp(`\\b${error.varName}\\b(?=\\s*[:=,)])`, 'g');
          } else {
            // Regular variable: let/const varName
            replacement = new RegExp(`\\b(let|const|var)\\s+${error.varName}\\b`, 'g');
          }

          if (replacement) {
            const newLine = line.replace(replacement, (match, keyword) => {
              if (keyword) {
                return `${keyword} _${error.varName}`;
              } else {
                return `_${error.varName}`;
              }
            });

            if (newLine !== line) {
              lines[lineIndex] = newLine;
              modified = true;
              console.log(`Fixed ${error.varName} in ${filePath}:${error.line}`);
            }
          }
        }
      }

      if (modified) {
        content = lines.join('\n');
        fs.writeFileSync(filePath, content);
      }
    }

    console.log('Unused variable fixing complete!');
  } catch (error) {
    console.error('Error fixing unused vars:', error);
  }
}

// Run the script
fixUnusedVars().catch(console.error);
