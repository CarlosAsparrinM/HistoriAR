import HistoricalData from '../models/HistoricalData.js';
import * as s3Service from '../services/s3Service.js';

const MEDIA_URL_EXPIRATION_SECONDS = 60 * 60;

async function signIfNeeded(value) {
  const key = s3Service.resolveS3Key(value);
  if (!key) return value || null;
  return s3Service.generatePresignedGetUrl({ key, expiresIn: MEDIA_URL_EXPIRATION_SECONDS });
}

/**
 * Get all historical data entries for a monument
 */
export async function getHistoricalDataByMonument(req, res) {
  try {
    const { monumentId } = req.params;

    const historicalData = await HistoricalData.find({ monumentId })
      .populate('createdBy', 'name email')
      .sort({ order: 1, createdAt: 1 });

    const response = await Promise.all(historicalData.map(async (entry) => {
      const plain = entry.toObject();
      plain.imageUrl = await signIfNeeded(plain.s3ImageKey || plain.imageUrl);
      return plain;
    }));

    res.json(response);
  } catch (err) {
    console.error('Error fetching historical data:', err);
    res.status(500).json({ message: err.message });
  }
}

/**
 * Get a single historical data entry
 */
export async function getHistoricalDataById(req, res) {
  try {
    const { id } = req.params;

    const historicalData = await HistoricalData.findById(id)
      .populate('createdBy', 'name email');

    if (!historicalData) {
      return res.status(404).json({ message: 'Historical data not found' });
    }

    const plain = historicalData.toObject();
    plain.imageUrl = await signIfNeeded(plain.s3ImageKey || plain.imageUrl);

    res.json(plain);
  } catch (err) {
    console.error('Error fetching historical data:', err);
    res.status(500).json({ message: err.message });
  }
}

/**
 * Create a new historical data entry
 */
export async function createHistoricalData(req, res) {
  try {
    const { monumentId } = req.params;
    const { title, description, discoveryInfo, activities, sources } = req.body;
    const userId = req.user?.sub || req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: 'User authentication failed' });
    }

    // Validate required fields
    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    let imageUrl = null;
    let s3ImageKey = null;
    let s3ImageFileName = null;

    // Handle image upload if provided
    if (req.file) {
      try {
        // TODO: Implement S3 upload for historical data images
        // For now, use basic S3 upload
        const timestamp = Date.now();
        const filename = `historical_${timestamp}_${req.file.originalname}`;
        
        s3ImageKey = `images/monuments/${monumentId}/historical/${filename}`;
        imageUrl = await s3Service.uploadFileToS3(
          req.file.buffer,
          s3ImageKey,
          req.file.mimetype
        );
        s3ImageFileName = filename;
      } catch (uploadError) {
        console.error('Error uploading image:', uploadError);
        return res.status(500).json({ message: 'Failed to upload image to S3' });
      }
    }

    // Get the highest order number for this monument
    const lastEntry = await HistoricalData.findOne({ monumentId })
      .sort({ order: -1 })
      .select('order');
    
    const order = lastEntry ? lastEntry.order + 1 : 0;

    // Create historical data entry
    const historicalData = new HistoricalData({
      monumentId,
      title,
      description,
      imageUrl,
      s3ImageKey,
      s3ImageFileName,
      discoveryInfo,
      activities: activities ? JSON.parse(activities) : [],
      sources: sources ? JSON.parse(sources) : [],
      createdBy: userId,
      order
    });

    await historicalData.save();

    // Populate createdBy before sending response
    await historicalData.populate('createdBy', 'name email');

    res.status(201).json(historicalData);
  } catch (err) {
    console.error('Error creating historical data:', err);
    res.status(500).json({ message: err.message });
  }
}

/**
 * Update a historical data entry
 */
export async function updateHistoricalData(req, res) {
  try {
    const { id } = req.params;
    const { title, description, discoveryInfo, activities, sources } = req.body;

    const historicalData = await HistoricalData.findById(id);

    if (!historicalData) {
      return res.status(404).json({ message: 'Historical data not found' });
    }

    // Update fields
    if (title) historicalData.title = title;
    if (description !== undefined) historicalData.description = description;
    if (discoveryInfo !== undefined) historicalData.discoveryInfo = discoveryInfo;
    if (activities) historicalData.activities = JSON.parse(activities);
    if (sources) historicalData.sources = JSON.parse(sources);

    // Handle image upload if provided
    if (req.file) {
      try {
        // Delete old image if exists
        if (historicalData.s3ImageKey || historicalData.imageUrl) {
          await s3Service.deleteFileFromS3(historicalData.s3ImageKey || historicalData.imageUrl);
        }

        // Upload new image to S3
        const timestamp = Date.now();
        const filename = `historical_${timestamp}_${req.file.originalname}`;
        
        const s3ImageKey = `images/monuments/${historicalData.monumentId}/historical/${filename}`;
        const imageUrl = await s3Service.uploadFileToS3(
          req.file.buffer,
          s3ImageKey,
          req.file.mimetype
        );
        
        historicalData.imageUrl = imageUrl;
        historicalData.s3ImageKey = s3ImageKey;
        historicalData.s3ImageFileName = filename;
      } catch (uploadError) {
        console.error('Error uploading image:', uploadError);
        return res.status(500).json({ message: 'Failed to upload image to S3' });
      }
    }

    await historicalData.save();

    // Populate createdBy before sending response
    await historicalData.populate('createdBy', 'name email');

    res.json(historicalData);
  } catch (err) {
    console.error('Error updating historical data:', err);
    res.status(500).json({ message: err.message });
  }
}

/**
 * Delete a historical data entry
 */
export async function deleteHistoricalData(req, res) {
  try {
    const { id } = req.params;

    const historicalData = await HistoricalData.findById(id);

    if (!historicalData) {
      return res.status(404).json({ message: 'Historical data not found' });
    }

    // Delete image from S3 if exists
    if (historicalData.s3ImageKey || historicalData.imageUrl) {
      try {
        await s3Service.deleteFileFromS3(historicalData.s3ImageKey || historicalData.imageUrl);
      } catch (deleteError) {
        console.error('Error deleting image from S3:', deleteError);
        // Continue with deletion even if S3 deletion fails
      }
    }

    await HistoricalData.findByIdAndDelete(id);

    res.json({ message: 'Historical data deleted successfully' });
  } catch (err) {
    console.error('Error deleting historical data:', err);
    res.status(500).json({ message: err.message });
  }
}

/**
 * Reorder historical data entries
 */
export async function reorderHistoricalData(req, res) {
  try {
    const { monumentId } = req.params;
    const { items } = req.body; // Array of { id, order }

    if (!Array.isArray(items)) {
      return res.status(400).json({ message: 'Items must be an array' });
    }

    // Update order for each item
    const updatePromises = items.map(item =>
      HistoricalData.findByIdAndUpdate(item.id, { order: item.order })
    );

    await Promise.all(updatePromises);

    res.json({ message: 'Order updated successfully' });
  } catch (err) {
    console.error('Error reordering historical data:', err);
    res.status(500).json({ message: err.message });
  }
}
