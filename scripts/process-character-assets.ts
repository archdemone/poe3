#!/usr/bin/env ts-node

/**
 * Character Asset Processing Pipeline
 *
 * This script provides a comprehensive pipeline for processing character assets:
 * - FBX to GLB conversion
 * - GLB validation and optimization
 * - Animation compression options
 * - Progressive loading support
 */

import { promises as fs } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { execSync } from 'child_process';
import { Document, NodeIO } from '@gltf-transform/core';
import { resample, simplify, textureCompress, draco } from '@gltf-transform/functions';

interface AssetConfig {
  inputDir: string;
  outputDir: string;
  compression?: {
    enabled: boolean;
    draco?: boolean;
    textureCompression?: boolean;
    simplifyRatio?: number;
  };
  validation?: {
    enabled: boolean;
    checkAnimations?: boolean;
    checkMaterials?: boolean;
  };
  progressive?: {
    enabled: boolean;
    baseQuality: number;
    lodLevels: number;
  };
}

interface ProcessingResult {
  success: boolean;
  inputFile: string;
  outputFile: string;
  errors: string[];
  warnings: string[];
  stats: {
    originalSize: number;
    processedSize: number;
    compressionRatio: number;
    animationsCount: number;
    meshesCount: number;
    processingTime: number;
  };
}

class CharacterAssetPipeline {
  private io: NodeIO;

  constructor() {
    this.io = new NodeIO();
  }

  /**
   * Main processing function
   */
  async processAssets(config: AssetConfig): Promise<ProcessingResult[]> {
    const results: ProcessingResult[] = [];
    const startTime = Date.now();

    try {
      // Ensure output directory exists
      await fs.mkdir(config.outputDir, { recursive: true });

      // Find all FBX files
      const fbxFiles = await this.findFbxFiles(config.inputDir);

      console.log(`Found ${fbxFiles.length} FBX files to process`);

      for (const fbxFile of fbxFiles) {
        const result = await this.processSingleAsset(fbxFile, config);
        results.push(result);

        if (result.success) {
          console.log(`✅ Processed: ${basename(fbxFile)}`);
        } else {
          console.log(`❌ Failed: ${basename(fbxFile)} - ${result.errors.join(', ')}`);
        }
      }

      // Generate progressive loading manifest if enabled
      if (config.progressive?.enabled) {
        await this.generateProgressiveManifest(results, config);
      }

      const totalTime = Date.now() - startTime;
      console.log(`\n🎯 Processing complete in ${totalTime}ms`);
      console.log(`Success: ${results.filter(r => r.success).length}/${results.length}`);

    } catch (error) {
      console.error('Pipeline error:', error);
    }

    return results;
  }

  /**
   * Process a single FBX file
   */
  private async processSingleAsset(fbxFile: string, config: AssetConfig): Promise<ProcessingResult> {
    const startTime = Date.now();
    const result: ProcessingResult = {
      success: false,
      inputFile: fbxFile,
      outputFile: '',
      errors: [],
      warnings: [],
      stats: {
        originalSize: 0,
        processedSize: 0,
        compressionRatio: 1,
        animationsCount: 0,
        meshesCount: 0,
        processingTime: 0
      }
    };

    try {
      // Get input file stats
      const inputStats = await fs.stat(fbxFile);
      result.stats.originalSize = inputStats.size;

      // Determine output path
      const relativePath = fbxFile.replace(config.inputDir, '').replace(/\.fbx$/i, '.glb');
      const outputFile = join(config.outputDir, relativePath.replace(/^\//, ''));
      result.outputFile = outputFile;

      // Ensure output directory exists
      await fs.mkdir(dirname(outputFile), { recursive: true });

      // Convert FBX to GLB
      console.log(`Converting ${basename(fbxFile)}...`);
      await this.convertFbxToGlb(fbxFile, outputFile);

      // Validate the GLB
      if (config.validation?.enabled) {
        await this.validateGlb(outputFile, result, config.validation);
      }

      // Optimize/Compress if enabled
      if (config.compression?.enabled) {
        await this.optimizeGlb(outputFile, config.compression);
      }

      // Generate LODs if progressive loading enabled
      if (config.progressive?.enabled) {
        await this.generateLods(outputFile, config.progressive);
      }

      // Update stats
      const outputStats = await fs.stat(outputFile);
      result.stats.processedSize = outputStats.size;
      result.stats.compressionRatio = result.stats.processedSize / result.stats.originalSize;
      result.stats.processingTime = Date.now() - startTime;

      result.success = true;

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : String(error));
    }

    return result;
  }

  /**
   * Convert FBX to GLB using fbx2gltf
   */
  private async convertFbxToGlb(inputFile: string, outputFile: string): Promise<void> {
    try {
      // Use fbx2gltf command line tool
      const command = `npx fbx2gltf -i "${inputFile}" -o "${outputFile}" --binary`;
      execSync(command, { stdio: 'inherit' });
    } catch (error) {
      // If fbx2gltf fails, try alternative conversion method
      console.warn('fbx2gltf failed, trying alternative method...');
      await this.convertFbxToGlbAlternative(inputFile, outputFile);
    }
  }

  /**
   * Alternative FBX conversion method (placeholder for when fbx2gltf isn't available)
   */
  private async convertFbxToGlbAlternative(inputFile: string, outputFile: string): Promise<void> {
    // For now, copy the file with .glb extension (will be validated later)
    // In a real implementation, you might use a different converter
    await fs.copyFile(inputFile, outputFile.replace('.glb', '.fbx'));
    throw new Error('FBX conversion requires fbx2gltf. Please install it: npm install -g fbx2gltf');
  }

  /**
   * Validate GLB file
   */
  private async validateGlb(filePath: string, result: ProcessingResult, validation: NonNullable<AssetConfig['validation']>): Promise<void> {
    try {
      const document = await this.io.read(filePath);

      // Check basic structure
      const root = document.getRoot();
      const scenes = root.listScenes();
      const meshes = root.listMeshes();
      const animations = root.listAnimations();

      result.stats.meshesCount = meshes.length;
      result.stats.animationsCount = animations.length;

      if (scenes.length === 0) {
        result.warnings.push('No scenes found');
      }

      if (meshes.length === 0) {
        result.errors.push('No meshes found');
      }

      // Validate animations if requested
      if (validation.checkAnimations && animations.length === 0) {
        result.warnings.push('No animations found');
      }

      // Validate materials if requested
      if (validation.checkMaterials) {
        const materials = root.listMaterials();
        if (materials.length === 0) {
          result.warnings.push('No materials found');
        }
      }

      console.log(`Validated: ${meshes.length} meshes, ${animations.length} animations`);

    } catch (error) {
      result.errors.push(`Validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Optimize GLB file
   */
  private async optimizeGlb(filePath: string, compression: NonNullable<AssetConfig['compression']>): Promise<void> {
    const document = await this.io.read(filePath);

    // Apply optimizations
    if (compression.draco) {
      await document.transform(draco());
    }

    if (compression.textureCompression) {
      await document.transform(textureCompress());
    }

    if (compression.simplifyRatio && compression.simplifyRatio < 1) {
      await document.transform(simplify({ ratio: compression.simplifyRatio }));
    }

    // Resample animations for better compression
    await document.transform(resample());

    await this.io.write(filePath, document);
    console.log(`Optimized: ${basename(filePath)}`);
  }

  /**
   * Generate LOD levels for progressive loading
   */
  private async generateLods(baseFile: string, progressive: NonNullable<AssetConfig['progressive']>): Promise<void> {
    const baseName = basename(baseFile, '.glb');
    const dir = dirname(baseFile);

    for (let lod = 1; lod <= progressive.lodLevels; lod++) {
      const lodFile = join(dir, `${baseName}_lod${lod}.glb`);
      const document = await this.io.read(baseFile);

      // Create LOD by simplifying geometry
      const simplifyRatio = Math.pow(progressive.baseQuality, lod);
      await document.transform(simplify({ ratio: simplifyRatio }));

      await this.io.write(lodFile, document);
      console.log(`Generated LOD${lod}: ${basename(lodFile)}`);
    }
  }

  /**
   * Generate progressive loading manifest
   */
  private async generateProgressiveManifest(results: ProcessingResult[], config: AssetConfig): Promise<void> {
    const manifest = {
      version: '1.0.0',
      generated: new Date().toISOString(),
      assets: results
        .filter(r => r.success)
        .map(r => ({
          name: basename(r.inputFile, '.fbx'),
          baseFile: r.outputFile.replace(config.outputDir, '').replace(/^\//, ''),
          lods: config.progressive!.lodLevels,
          stats: r.stats
        }))
    };

    const manifestPath = join(config.outputDir, 'progressive-manifest.json');
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`Generated progressive manifest: ${basename(manifestPath)}`);
  }

  /**
   * Find all FBX files recursively
   */
  private async findFbxFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    async function scan(directory: string): Promise<void> {
      const entries = await fs.readdir(directory, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(directory, entry.name);

        if (entry.isDirectory()) {
          await scan(fullPath);
        } else if (entry.isFile() && extname(entry.name).toLowerCase() === '.fbx') {
          files.push(fullPath);
        }
      }
    }

    await scan(dir);
    return files;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: ts-node process-character-assets.ts <input-dir> <output-dir> [options]');
    console.log('Options:');
    console.log('  --compress          Enable compression');
    console.log('  --draco             Enable Draco compression');
    console.log('  --validate          Enable validation');
    console.log('  --progressive       Enable progressive loading');
    console.log('  --lods=<number>     Number of LOD levels (default: 3)');
    process.exit(1);
  }

  const [inputDir, outputDir] = args;
  const options = args.slice(2);

  const config: AssetConfig = {
    inputDir,
    outputDir,
    compression: {
      enabled: options.includes('--compress'),
      draco: options.includes('--draco'),
      textureCompression: false,
      simplifyRatio: 0.8
    },
    validation: {
      enabled: options.includes('--validate'),
      checkAnimations: true,
      checkMaterials: true
    },
    progressive: {
      enabled: options.includes('--progressive'),
      baseQuality: 0.6,
      lodLevels: 3
    }
  };

  // Parse LOD levels
  const lodOption = options.find(opt => opt.startsWith('--lods='));
  if (lodOption && config.progressive) {
    config.progressive.lodLevels = parseInt(lodOption.split('=')[1]) || 3;
  }

  const pipeline = new CharacterAssetPipeline();
  const results = await pipeline.processAssets(config);

  // Print summary
  const successCount = results.filter(r => r.success).length;
  const totalSizeBefore = results.reduce((sum, r) => sum + r.stats.originalSize, 0);
  const totalSizeAfter = results.reduce((sum, r) => sum + r.stats.processedSize, 0);
  const avgCompression = totalSizeAfter / totalSizeBefore;

  console.log('\n📊 Summary:');
  console.log(`Files processed: ${successCount}/${results.length}`);
  console.log(`Total size: ${(totalSizeBefore / 1024 / 1024).toFixed(2)}MB → ${(totalSizeAfter / 1024 / 1024).toFixed(2)}MB`);
  console.log(`Compression ratio: ${(avgCompression * 100).toFixed(1)}%`);

  if (results.some(r => r.errors.length > 0)) {
    console.log('\n❌ Errors:');
    results.filter(r => r.errors.length > 0).forEach(r => {
      console.log(`  ${basename(r.inputFile)}: ${r.errors.join(', ')}`);
    });
  }

  if (results.some(r => r.warnings.length > 0)) {
    console.log('\n⚠️  Warnings:');
    results.filter(r => r.warnings.length > 0).forEach(r => {
      console.log(`  ${basename(r.inputFile)}: ${r.warnings.join(', ')}`);
    });
  }
}

// Export for programmatic use
export { CharacterAssetPipeline, AssetConfig, ProcessingResult };

if (require.main === module) {
  main().catch(console.error);
}
