/**
 * Servicio para procesamiento de modelos 3D a 3D Tiles (Cesium)
 * 
 * NOTA: Esta es una implementación de referencia. El procesamiento real
 * requiere Cesium 3D Tiles Tools instalado en el sistema.
 * 
 * Instalación de Cesium Tools:
 * npm install -g 3d-tiles-tools
 * 
 * O usar Docker:
 * docker pull cesium/3d-tiles-tools
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as s3Service from './s3Service.js';
import Monument from '../models/Monument.js';
import ModelVersion from '../models/ModelVersion.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class Tiles3DService {
  constructor() {
    this.tempDir = path.join(__dirname, '../../temp/tiles');
    this.maxFileSize = 50 * 1024 * 1024; // 50MB
  }

  /**
   * Verificar si Cesium 3D Tiles Tools está instalado
   */
  async isCesiumToolsInstalled() {
    return new Promise((resolve) => {
      const child = spawn('3d-tiles-tools', ['--version']);
      
      child.on('error', () => resolve(false));
      child.on('close', (code) => resolve(code === 0));
    });
  }

  /**
   * Validar archivo para procesamiento de tiles
   */
  validateModelForTiles(fileBuffer, mimeType) {
    const allowedMimeTypes = ['model/gltf-binary', 'model/gltf+json'];
    
    if (!allowedMimeTypes.includes(mimeType)) {
      throw new Error('Invalid file format. Only GLB and GLTF are supported for tiles processing');
    }
    
    if (fileBuffer.length > this.maxFileSize) {
      throw new Error(`File size exceeds maximum of ${this.maxFileSize / 1024 / 1024}MB`);
    }
    
    return true;
  }

  /**
   * Crear directorio temporal si no existe
   */
  async ensureTempDir() {
    try {
      await fs.access(this.tempDir);
    } catch {
      await fs.mkdir(this.tempDir, { recursive: true });
    }
  }

  /**
   * Procesar modelo GLB/GLTF a 3D Tiles
   * 
   * @param {string} modelPath - Ruta al archivo GLB/GLTF
   * @param {string} monumentName - Nombre del monumento
   * @param {string} timestamp - Timestamp para versionado
   * @returns {Promise<string>} Ruta al directorio de tiles generados
   */
  async processModelToTiles(modelPath, monumentName, timestamp) {
    const toolsInstalled = await this.isCesiumToolsInstalled();
    
    if (!toolsInstalled) {
      console.warn('⚠️  Cesium 3D Tiles Tools not installed. Skipping tiles processing.');
      console.warn('   Install with: npm install -g 3d-tiles-tools');
      return null;
    }

    await this.ensureTempDir();
    
    const sanitizedName = monumentName.replace(/[^a-zA-Z0-9]/g, '_');
    const outputDir = path.join(this.tempDir, `${sanitizedName}_${timestamp}`);
    
    return new Promise((resolve, reject) => {
      console.log(`Processing 3D Tiles for ${monumentName}...`);
      
      // Comando para generar tiles con 3 niveles de LOD
      const args = [
        'gltfToTileset',
        '-i', modelPath,
        '-o', outputDir,
        '--geometricError', '32',
        '--levels', '3'
      ];
      
      const child = spawn('3d-tiles-tools', args);
      
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          console.log(`✓ 3D Tiles generated successfully: ${outputDir}`);
          resolve(outputDir);
        } else {
          console.error(`✗ Tiles processing failed with code ${code}`);
          console.error(stderr);
          reject(new Error(`Tiles processing failed: ${stderr}`));
        }
      });
      
      child.on('error', (error) => {
        reject(new Error(`Failed to start tiles processing: ${error.message}`));
      });
    });
  }

  /**
   * Subir tiles generados a S3
   * 
   * @param {string} localPath - Ruta local al directorio de tiles
   * @param {string} monumentName - Nombre del monumento
   * @param {string} timestamp - Timestamp para versionado
   * @returns {Promise<string>} URL del tileset.json en S3
   */
  async uploadTilesToS3(localPath, monumentId, timestamp) {
    const s3Path = `models/monuments/${monumentId}/tiles/${timestamp}`;
    
    try {
      // Leer todos los archivos del directorio de tiles
      const files = await this.getAllFiles(localPath);
      
      console.log(`Uploading ${files.length} tile files to S3...`);
      
      // Subir cada archivo manteniendo la estructura de directorios
      for (const file of files) {
        const relativePath = path.relative(localPath, file);
        const s3Key = `${s3Path}/${relativePath}`;
        
        const fileBuffer = await fs.readFile(file);
        const mimeType = this.getMimeType(file);
        
        // Upload to S3
        await s3Service.uploadFileToS3(fileBuffer, s3Key, mimeType);
      }
      
      // URL del tileset.json principal
      const bucketName = process.env.S3_BUCKET;
      const region = process.env.AWS_REGION;
      const tilesetUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${s3Path}/tileset.json`;
      
      console.log(`✓ Tiles uploaded successfully to S3: ${s3Path}`);
      
      return tilesetUrl;
    } catch (error) {
      console.error('Error uploading tiles to S3:', error);
      throw new Error(`Failed to upload tiles: ${error.message}`);
    }
  }

  /**
   * Obtener todos los archivos de un directorio recursivamente
   */
  async getAllFiles(dirPath, arrayOfFiles = []) {
    const files = await fs.readdir(dirPath);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = await fs.stat(filePath);
      
      if (stat.isDirectory()) {
        arrayOfFiles = await this.getAllFiles(filePath, arrayOfFiles);
      } else {
        arrayOfFiles.push(filePath);
      }
    }
    
    return arrayOfFiles;
  }

  /**
   * Determinar MIME type basado en extensión
   */
  getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.json': 'application/json',
      '.glb': 'model/gltf-binary',
      '.gltf': 'model/gltf+json',
      '.bin': 'application/octet-stream',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg'
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Limpiar archivos temporales
   */
  async cleanupTempFiles(dirPath) {
    try {
      await fs.rm(dirPath, { recursive: true, force: true });
      console.log(`✓ Cleaned up temporary files: ${dirPath}`);
    } catch (error) {
      console.error('Error cleaning up temp files:', error);
    }
  }

  /**
   * Procesar modelo completo: generar tiles y subir a S3
   * 
   * @param {Buffer} fileBuffer - Buffer del archivo GLB/GLTF
   * @param {string} monumentName - Nombre del monumento
   * @param {string} monumentId - ID del monumento
   * @param {string} userId - ID del usuario que sube
   * @returns {Promise<string|null>} URL del tileset.json o null si no se procesó
   */
  async processAndUploadTiles(fileBuffer, monumentName, monumentId, userId) {
    const toolsInstalled = await this.isCesiumToolsInstalled();
    
    if (!toolsInstalled) {
      console.warn('⚠️  Skipping 3D Tiles processing (Cesium Tools not installed)');
      return null;
    }

    await this.ensureTempDir();
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sanitizedName = monumentName.replace(/[^a-zA-Z0-9]/g, '_');
    const tempModelPath = path.join(this.tempDir, `${sanitizedName}_${timestamp}.glb`);
    
    try {
      // Guardar modelo temporalmente
      await fs.writeFile(tempModelPath, fileBuffer);
      
      // Procesar a tiles
      const tilesDir = await this.processModelToTiles(tempModelPath, monumentName, timestamp);
      
      if (!tilesDir) {
        return null;
      }
      
      // Subir tiles a S3
      const tilesetUrl = await this.uploadTilesToS3(tilesDir, monumentId, timestamp);
      
      // Actualizar Monument con URL de tiles
      await Monument.findByIdAndUpdate(monumentId, {
        model3DTilesUrl: tilesetUrl
      });
      
      // Actualizar ModelVersion con URL de tiles (si existe)
      const latestVersion = await ModelVersion.findOne({
        monumentId,
        isActive: true
      });
      
      if (latestVersion) {
        latestVersion.tilesUrl = tilesetUrl;
        await latestVersion.save();
      }
      
      // Limpiar archivos temporales
      await this.cleanupTempFiles(tempModelPath);
      await this.cleanupTempFiles(tilesDir);
      
      console.log(`✓ 3D Tiles processing completed for ${monumentName}`);
      
      return tilesetUrl;
    } catch (error) {
      console.error('Error in tiles processing pipeline:', error);
      
      // Limpiar en caso de error
      try {
        await this.cleanupTempFiles(tempModelPath);
      } catch {}
      
      // No lanzar error, solo retornar null
      // El modelo GLB original sigue disponible
      return null;
    }
  }
}

export default new Tiles3DService();
