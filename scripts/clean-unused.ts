#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';

const TMP_DIRS = ['tmp', 'generated', 'dist'];
const TMP_FILES = ['*.tmp', '*.generated'];

function cleanUnusedFiles() {
  console.log('Checking for unused files to clean...');

  for (const dir of TMP_DIRS) {
    if (fs.existsSync(dir)) {
      console.log(`Found ${dir} directory - consider manual cleanup if truly unused`);
      // Don't auto-delete directories, just report
    }
  }

  // Check for obvious temp files
  const tempFiles = [
    ...fs.readdirSync('.').filter(f => TMP_FILES.some(pattern => f.endsWith(pattern.replace('*', ''))))
  ];

  if (tempFiles.length > 0) {
    console.log('Found potential temp files:', tempFiles);
    // Don't auto-delete, just report
  } else {
    console.log('No obvious temp files found');
  }

  console.log('Manual cleanup may be needed for tmp/ or generated/ directories');
}

cleanUnusedFiles();
