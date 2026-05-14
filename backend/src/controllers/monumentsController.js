import { buildPagination } from '../utils/pagination.js';
import { getAllMonuments, getMonumentById, createMonument, updateMonument, deleteMonument, searchMonuments, getFilterOptions, getMonumentStats } from '../services/monumentService.js';
import * as s3Service from '../services/s3Service.js';
import { hydrateMedia, signIfNeeded } from '../utils/s3-helpers.js';

const MEDIA_URL_EXPIRATION_SECONDS = 60 * 60;

function parseBooleanFlag(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return Boolean(value);
}

function toNullableInteger(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error('Los anios del periodo deben ser numericos.');
  }
  return Math.trunc(parsed);
}

function normalizeMonumentPayload(payload) {
  const normalized = { ...payload };

  const shouldNormalizeCultures = Object.prototype.hasOwnProperty.call(normalized, 'cultures')
    || Object.prototype.hasOwnProperty.call(normalized, 'culture');

  if (shouldNormalizeCultures) {
    const rawCultures = [];

    if (Array.isArray(normalized.cultures)) {
      rawCultures.push(...normalized.cultures);
    }

    if (typeof normalized.culture === 'string' && normalized.culture.trim()) {
      rawCultures.push(normalized.culture.trim());
    }

    const uniqueCultures = [];
    const seen = new Set();

    rawCultures
      .map((value) => String(value || '').trim())
      .filter(Boolean)
      .forEach((cultureName) => {
        const normalizedKey = cultureName.toLowerCase();
        if (seen.has(normalizedKey)) return;
        seen.add(normalizedKey);
        uniqueCultures.push(cultureName);
      });

    normalized.cultures = uniqueCultures;
    normalized.culture = uniqueCultures[0] || '';
  }

  if (normalized.period && typeof normalized.period === 'object') {
    const period = { ...normalized.period };
    const isIdentified = parseBooleanFlag(period.isIdentified, true);
    const startYear = toNullableInteger(period.startYear);
    const endYear = toNullableInteger(period.endYear);

    if (isIdentified && startYear === null) {
      throw new Error('Debe ingresar al menos el anio de inicio o marcarlo como no identificado.');
    }

    if (isIdentified && startYear !== null && endYear !== null && endYear < startYear) {
      throw new Error('El anio de fin no puede ser menor al anio de inicio.');
    }

    period.isIdentified = isIdentified;
    period.startYear = isIdentified ? startYear : null;
    period.endYear = isIdentified ? endYear : null;
    normalized.period = period;
  }

  if (normalized.discovery && typeof normalized.discovery === 'object') {
    const discovery = { ...normalized.discovery };
    const isDateKnownFlag = parseBooleanFlag(discovery.isDateKnown, false);
    const isDiscovererKnown = parseBooleanFlag(discovery.isDiscovererKnown, false);
    const allowedDatePrecisions = new Set(['exact', 'month', 'year', 'unknown']);

    const requestedPrecision = String(
      discovery.datePrecision || (isDateKnownFlag ? 'exact' : 'unknown')
    ).toLowerCase();

    const datePrecision = allowedDatePrecisions.has(requestedPrecision)
      ? requestedPrecision
      : (isDateKnownFlag ? 'exact' : 'unknown');

    discovery.datePrecision = datePrecision;
    discovery.isDateKnown = datePrecision !== 'unknown';
    discovery.isDiscovererKnown = isDiscovererKnown;

    if (datePrecision === 'unknown') {
      discovery.discoveredAt = null;
      discovery.discoveredYear = null;
      discovery.discoveredMonth = null;
    } else if (datePrecision === 'exact') {
      if (!discovery.discoveredAt) {
        throw new Error('Debe ingresar la fecha exacta de descubrimiento.');
      }

      const parsedDate = new Date(discovery.discoveredAt);
      if (Number.isNaN(parsedDate.getTime())) {
        throw new Error('La fecha de descubrimiento no es valida.');
      }

      discovery.discoveredAt = parsedDate;
      discovery.discoveredYear = parsedDate.getUTCFullYear();
      discovery.discoveredMonth = parsedDate.getUTCMonth() + 1;
    } else if (datePrecision === 'month') {
      const discoveredYear = toNullableInteger(discovery.discoveredYear);
      const discoveredMonth = toNullableInteger(discovery.discoveredMonth);

      if (discoveredYear === null || discoveredMonth === null) {
        throw new Error('Debe ingresar mes y anio de descubrimiento.');
      }

      if (discoveredMonth < 1 || discoveredMonth > 12) {
        throw new Error('El mes de descubrimiento debe estar entre 1 y 12.');
      }

      discovery.discoveredYear = discoveredYear;
      discovery.discoveredMonth = discoveredMonth;
      discovery.discoveredAt = new Date(Date.UTC(discoveredYear, discoveredMonth - 1, 1));
    } else if (datePrecision === 'year') {
      const discoveredYear = toNullableInteger(discovery.discoveredYear);

      if (discoveredYear === null) {
        throw new Error('Debe ingresar el anio de descubrimiento.');
      }

      discovery.discoveredYear = discoveredYear;
      discovery.discoveredMonth = null;
      discovery.discoveredAt = new Date(Date.UTC(discoveredYear, 0, 1));
    }

    if (isDiscovererKnown) {
      const trimmedName = String(discovery.discovererName || '').trim();
      if (!trimmedName) {
        throw new Error('Debe ingresar el nombre del descubridor o marcarlo como desconocido.');
      }
      discovery.discovererName = trimmedName;
    } else {
      discovery.discovererName = null;
    }

    normalized.discovery = discovery;
  }

  return normalized;
}

async function hydrateMonumentMedia(monument) {
  return hydrateMedia(monument, [
    { urlField: 'imageUrl', keyField: 's3ImageKey' },
    { urlField: 'model3DUrl', keyField: 's3ModelKey' },
    { urlField: 'model3DTilesUrl', keyField: 's3ModelTilesKey' }
  ]);
}

export async function listMonument(req, res) {
  try {
    const { skip, limit, page } = buildPagination(req.query);
    const filter = {};
    if (req.query.categoryId) filter.categoryId = req.query.categoryId;
    if (req.query.category) filter.categoryId = req.query.category;
    if (req.query.status)   filter.status   = req.query.status;

    if (req.query.hasModel === 'true') {
      filter.model3DUrl = { $nin: [null, ''] };
    } else if (req.query.hasModel === 'false') {
      filter.$or = [{ model3DUrl: null }, { model3DUrl: '' }];
    }
    
    // Support availableOnly filter
    if (req.query.availableOnly === 'true') {
      filter.status = 'Disponible';
    }
    
    const { items, total } = await getAllMonuments(filter, {
      skip,
      limit,
      populate: req.query.populate === 'true',
      text: req.query.text || ''
    });
    const hydratedItems = await Promise.all(items.map(hydrateMonumentMedia));
    res.json({ page, total, items: hydratedItems });
  } catch (err) { res.status(500).json({ message: err.message }); }
}

export async function getMonumentStatsController(req, res) {
  try {
    const filter = {};
    if (req.query.categoryId) filter.categoryId = req.query.categoryId;
    if (req.query.category) filter.categoryId = req.query.category;

    const stats = await getMonumentStats(filter);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function getMonument(req, res) {
  const doc = await getMonumentById(req.params.id, req.query.populate === 'true');
  if (!doc) return res.status(404).json({ message: 'No encontrado' });
  res.json(await hydrateMonumentMedia(doc));
}

export async function createMonumentController(req, res) {
  try {
    const payload = normalizeMonumentPayload({ ...req.body, createdBy: req.user?.sub });
    
    // Note: Image and model uploads should be done through /api/uploads endpoints
    // This controller only handles monument data creation
    
    const doc = await createMonument(payload);
    res.status(201).json({ id: doc._id });
  } catch (err) { 
    res.status(400).json({ message: err.message }); 
  }
}

export async function updateMonumentController(req, res) {
  try {
    const data = normalizeMonumentPayload({ ...req.body });
    
    // Get current monument to check status change
    const currentMonument = await getMonumentById(req.params.id);
    if (!currentMonument) {
      return res.status(404).json({ message: 'Monumento no encontrado' });
    }
    
    // Validate status change to "Disponible"
    if (data.status === 'Disponible' && currentMonument.status !== 'Disponible') {
      if (!currentMonument.imageUrl && !data.imageUrl) {
        return res.status(400).json({ 
          message: 'No se puede hacer disponible un monumento sin imagen. Por favor, agrega una imagen primero.' 
        });
      }
    }
    
    // Note: Image and model uploads should be done through /api/uploads endpoints
    // This controller only handles monument data updates
    
    const doc = await updateMonument(req.params.id, data);
    if (!doc) return res.status(404).json({ message: 'No encontrado' });
    res.json(doc);
  } catch (err) { 
    res.status(400).json({ message: err.message }); 
  }
}

export async function deleteMonumentController(req, res) {
  try {
    // Delete associated files from S3 first
    await s3Service.deleteMonumentFiles(req.params.id);
    console.log(`[S3] Files deleted for monument: ${req.params.id}`);
  } catch (s3Error) {
    // Log error but continue with monument deletion
    console.error('[S3] Error deleting files:', s3Error.message);
  }
  
  const doc = await deleteMonument(req.params.id);
  if (!doc) return res.status(404).json({ message: 'No encontrado' });
  res.json({ message: 'Monumento eliminado', id: doc._id });
}

export async function searchMonumentsController(req, res) {
  try {
    const { skip, limit, page } = buildPagination(req.query);
    const searchParams = {
      text: req.query.text,
      district: req.query.district,
      category: req.query.category,
      institution: req.query.institution
    };
    
    const { items, total } = await searchMonuments(searchParams, { 
      skip, 
      limit, 
      populate: req.query.populate === 'true' 
    });
    
    res.json({ page, total, items });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function getFilterOptionsController(req, res) {
  try {
    const options = await getFilterOptions();
    res.json(options);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

/**
 * Obtener historial de versiones de modelo 3D
 */
export async function getModelVersionsController(req, res) {
  try {
    const { id: monumentId } = req.params;

    // Verify monument exists
    const monument = await getMonumentById(monumentId);
    if (!monument) {
      return res.status(404).json({ message: 'Monument not found' });
    }

    // Import ModelVersion model
    const ModelVersion = (await import('../models/ModelVersion.js')).default;

    // Get all versions for this monument, sorted by upload date (newest first)
    const versions = await ModelVersion.find({ monumentId })
      .populate('uploadedBy', 'name email')
      .sort({ uploadedAt: -1 });

    res.json({
      monumentId,
      monumentName: monument.name,
      versions: await Promise.all(versions.map(async (v) => ({
        _id: v._id,
        id: v._id,
        filename: v.filename,
        s3Key: v.s3Key,
        url: await signIfNeeded(v.s3Key || v.url),
        uploadedAt: v.uploadedAt,
        uploadedBy: v.uploadedBy,
        isActive: v.isActive,
        fileSize: v.fileSize,
        tilesUrl: await signIfNeeded(v.tilesUrl)
      })))
    });
  } catch (err) {
    console.error('Error fetching model versions:', err);
    res.status(500).json({ message: err.message });
  }
}

/**
 * Activate a specific model version
 */
export async function activateModelVersionController(req, res) {
  try {
    const { id: monumentId, versionId } = req.params;

    // Verify monument exists
    const monument = await getMonumentById(monumentId);
    if (!monument) {
      return res.status(404).json({ message: 'Monument not found' });
    }

    // Import ModelVersion model
    const ModelVersion = (await import('../models/ModelVersion.js')).default;

    // Find the version to activate
    const versionToActivate = await ModelVersion.findOne({
      _id: versionId,
      monumentId
    });

    if (!versionToActivate) {
      return res.status(404).json({ message: 'Model version not found' });
    }

    // Deactivate all other versions
    await ModelVersion.updateMany(
      { monumentId, isActive: true },
      { isActive: false }
    );

    // Activate the selected version
    versionToActivate.isActive = true;
    await versionToActivate.save();

    // Update monument with this version's URL
    await updateMonument(monumentId, {
      model3DUrl: versionToActivate.url,
      s3ModelKey: versionToActivate.s3Key || s3Service.resolveS3Key(versionToActivate.url),
      model3DTilesUrl: versionToActivate.tilesUrl || null,
      s3ModelTilesKey: s3Service.resolveS3Key(versionToActivate.tilesUrl),
      s3ModelFileName: versionToActivate.filename
    });

    res.json({
      message: 'Model version activated successfully',
      version: {
        id: versionToActivate._id,
        url: await signIfNeeded(versionToActivate.s3Key || versionToActivate.url),
        filename: versionToActivate.filename,
        isActive: versionToActivate.isActive,
        tilesUrl: versionToActivate.tilesUrl
      }
    });
  } catch (err) {
    console.error('Error activating model version:', err);
    res.status(400).json({ message: err.message });
  }
}

/**
 * Eliminar versión de modelo 3D
 */
export async function deleteModelVersionController(req, res) {
  try {
    const { id: monumentId, versionId } = req.params;

    // Verify monument exists
    const monument = await getMonumentById(monumentId);
    if (!monument) {
      return res.status(404).json({ message: 'Monument not found' });
    }

    // Import ModelVersion model
    const ModelVersion = (await import('../models/ModelVersion.js')).default;

    // Find the version to delete
    const versionToDelete = await ModelVersion.findOne({
      _id: versionId,
      monumentId
    });

    if (!versionToDelete) {
      return res.status(404).json({ message: 'Model version not found' });
    }

    // Don't allow deleting the active version if it's the only one
    if (versionToDelete.isActive) {
      const versionCount = await ModelVersion.countDocuments({ monumentId });
      if (versionCount === 1) {
        return res.status(400).json({ 
          message: 'Cannot delete the only model version. Upload a new version first.' 
        });
      }
    }

    // Delete file from S3
    try {
      await s3Service.deleteFileFromS3(versionToDelete.url);
      
      // Delete tiles if they exist
      if (versionToDelete.tilesUrl) {
        // Extract the tiles directory path and delete all files
        // For now, we'll just log it - full implementation would need to list and delete all tile files
        console.log(`[S3] Tiles deletion for ${versionToDelete.tilesUrl} - implement if needed`);
      }
    } catch (s3Error) {
      console.error('[S3] Error deleting model file:', s3Error.message);
      // Continue with database deletion even if S3 deletion fails
    }

    // Delete the version from database
    await ModelVersion.findByIdAndDelete(versionId);

    // If this was the active version, activate the most recent remaining version
    if (versionToDelete.isActive) {
      const latestVersion = await ModelVersion.findOne({ monumentId })
        .sort({ uploadedAt: -1 });
      
      if (latestVersion) {
        latestVersion.isActive = true;
        await latestVersion.save();
        
        // Update monument with the new active version
        await updateMonument(monumentId, {
          model3DUrl: latestVersion.url,
          s3ModelKey: latestVersion.s3Key || s3Service.resolveS3Key(latestVersion.url),
          model3DTilesUrl: latestVersion.tilesUrl || null,
          s3ModelTilesKey: s3Service.resolveS3Key(latestVersion.tilesUrl),
          s3ModelFileName: latestVersion.filename
        });
      } else {
        // No versions left, clear monument's model URLs
        await updateMonument(monumentId, {
          model3DUrl: null,
          s3ModelKey: null,
          model3DTilesUrl: null,
          s3ModelTilesKey: null,
          s3ModelFileName: null
        });
      }
    }

    res.json({ 
      message: 'Model version deleted successfully',
      deletedVersionId: versionId
    });
  } catch (err) {
    console.error('Error deleting model version:', err);
    res.status(400).json({ message: err.message });
  }
}

/**
 * Upload a new 3D model version for a monument
 */
export async function uploadModelVersionController(req, res) {
  try {
    const { id: monumentId } = req.params;
    const userId = req.user?.sub || req.user?.id || req.user?._id;

    if (!req.file) {
      return res.status(400).json({ message: 'No model file provided' });
    }

    // Validate file type
    const allowedTypes = ['model/gltf-binary', 'application/octet-stream', 'model/gltf+json'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ message: 'Only GLB and GLTF model files are allowed' });
    }

    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024;
    if (req.file.size > maxSize) {
      return res.status(400).json({ message: 'Model size must be less than 50MB' });
    }

    // Get monument to verify it exists
    const monument = await getMonumentById(monumentId);
    if (!monument) {
      return res.status(404).json({ message: 'Monument not found' });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${timestamp}_${req.file.originalname}`;

    // Upload to S3
    const modelKey = `models/monuments/${monumentId}/${filename}`;
    const modelUrl = await s3Service.uploadModelToS3(
      req.file.buffer,
      filename,
      monumentId,
      req.file.mimetype
    );

    // Import ModelVersion model
    const ModelVersion = (await import('../models/ModelVersion.js')).default;

    // Deactivate all previous versions for this monument
    await ModelVersion.updateMany(
      { monumentId, isActive: true },
      { isActive: false }
    );

    // Create new model version
    const modelVersion = new ModelVersion({
      monumentId,
      filename,
      url: modelUrl,
      s3Key: modelKey,
      uploadedBy: userId,
      isActive: true,
      fileSize: req.file.size
    });

    await modelVersion.save();

    // Update monument with new model URL
    await updateMonument(monumentId, {
      model3DUrl: modelUrl,
      s3ModelKey: modelKey,
      s3ModelFileName: filename
    });

    // Optionally process 3D Tiles (if Cesium tools are installed)
    const tiles3DService = (await import('../services/tiles3DService.js')).default;
    try {
      const tilesetUrl = await tiles3DService.processAndUploadTiles(
        req.file.buffer,
        monument.name,
        monumentId,
        userId
      );
      
      if (tilesetUrl) {
        modelVersion.tilesUrl = tilesetUrl;
        await modelVersion.save();
      }
    } catch (tilesError) {
      console.warn('3D Tiles processing failed (non-critical):', tilesError.message);
      // Continue without tiles - the GLB model is still available
    }

    res.status(201).json({
      message: '3D model version uploaded successfully',
      version: {
        _id: modelVersion._id,
        id: modelVersion._id, // Include both for compatibility
        url: await signIfNeeded(modelKey),
        filename,
        uploadedAt: modelVersion.uploadedAt,
        isActive: modelVersion.isActive,
        fileSize: modelVersion.fileSize,
        tilesUrl: modelVersion.tilesUrl
      }
    });
  } catch (err) {
    console.error('Error uploading model version:', err);
    res.status(500).json({ message: err.message || 'Internal server error' });
  }
}

/**
 * Confirm a direct-to-S3 upload for a new 3D model version
 */
export async function confirmModelVersionUploadController(req, res) {
  try {
    const { id: monumentId } = req.params;
    const userId = req.user?.sub || req.user?.id || req.user?._id;
    const { key, filename, fileSize, tilesUrl = null } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'User authentication failed' });
    }

    if (!key || !filename || !fileSize) {
      return res.status(400).json({ message: 'key, filename and fileSize are required' });
    }

    const monument = await getMonumentById(monumentId);
    if (!monument) {
      return res.status(404).json({ message: 'Monument not found' });
    }

    const ModelVersion = (await import('../models/ModelVersion.js')).default;

    await ModelVersion.updateMany(
      { monumentId, isActive: true },
      { isActive: false }
    );

    const modelUrl = s3Service.buildPublicS3Url(key);
    const modelVersion = new ModelVersion({
      monumentId,
      filename,
      url: modelUrl,
      s3Key: key,
      uploadedBy: userId,
      isActive: true,
      fileSize: Number(fileSize),
      tilesUrl: tilesUrl || null
    });

    await modelVersion.save();

    await updateMonument(monumentId, {
      model3DUrl: modelUrl,
      s3ModelKey: key,
      s3ModelFileName: filename,
      model3DTilesUrl: tilesUrl || null,
      s3ModelTilesKey: s3Service.resolveS3Key(tilesUrl)
    });

    res.status(201).json({
      message: '3D model version registered successfully',
      version: {
        _id: modelVersion._id,
        id: modelVersion._id,
        url: await s3Service.generatePresignedGetUrl({ key }),
        s3Key: key,
        filename,
        uploadedAt: modelVersion.uploadedAt,
        isActive: modelVersion.isActive,
        fileSize: modelVersion.fileSize,
        tilesUrl: tilesUrl || null
      }
    });
  } catch (err) {
    console.error('Error confirming model version upload:', err);
    res.status(500).json({ message: err.message || 'Internal server error' });
  }
}
