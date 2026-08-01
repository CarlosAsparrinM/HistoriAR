import multer from 'multer';

// Configure multer to use memory storage for S3 uploads
const storage = multer.memoryStorage();

// Image upload configuration
export const uploadImage = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for images
  },
  fileFilter: (req, file, cb) => {
    // Check if file is an image
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid image format. Only JPEG, PNG, and WebP are allowed'), false);
    }
  }
});

// 3D Model upload configuration
export const uploadModel = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for 3D models
  },
  fileFilter: (req, file, cb) => {
    // Check if file is a 3D model
    const allowedExtensions = ['.glb', '.gltf'];
    const fileExtension = '.' + file.originalname.toLowerCase().split('.').pop();
    
    if (allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Only GLB and GLTF files are allowed'), false);
    }
  }
});
