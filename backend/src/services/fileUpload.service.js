const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const ApiError = require('../utils/apiError');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

class FileUploadService {
  constructor() {
    this.upload = this.configureMulter();
  }
  
  configureMulter() {
    const storage = new CloudinaryStorage({
      cloudinary: cloudinary,
      params: async (req, file) => {
        let folder = 'misc';
        if (file.fieldname === 'resourceFile') folder = 'resources';
        else if (file.fieldname === 'coverPhoto' || file.fieldname === 'coverImage') folder = 'covers';
        else if (file.fieldname === 'avatar') folder = 'avatars';
        
        return {
          folder: `resourcefull/${folder}`,
          resource_type: 'auto'
        };
      }
    });
    
    return multer({
      storage: storage,
      limits: { fileSize: 10485760 },
      fileFilter: (req, file, cb) => {
        this.validateFileType(file, cb);
      }
    });
  }
  
  validateFileType(file, cb) {
    const allowedTypes = {
      resourceFile: ['.pdf', '.mp3', '.mp4', '.jpg', '.png'],
      coverPhoto: ['.jpg', '.jpeg', '.png'],
      coverImage: ['.jpg', '.jpeg', '.png'],
      avatar: ['.jpg', '.jpeg', '.png']
    };
    
    const ext = '.' + file.originalname.split('.').pop().toLowerCase();
    const allowed = allowedTypes[file.fieldname];
    
    if (allowed && !allowed.includes(ext)) {
      cb(new ApiError(400, `Invalid format. Allowed: ${allowed.join(', ')}`), false);
      return;
    }
    
    cb(null, true);
  }
  
  getUploadMiddleware() {
    return this.upload.fields([
      { name: 'resourceFile', maxCount: 1 },
      { name: 'coverPhoto', maxCount: 1 }
    ]);
  }
  
  getUserProfileUploadMiddleware() {
    return this.upload.fields([
      { name: 'avatar', maxCount: 1 },
      { name: 'coverImage', maxCount: 1 }
    ]);
  }
  
  async uploadFile(file, directory) {
    return {
      url: file.path,
      format: file.originalname.split('.').pop().toLowerCase(),
      filename: file.filename,
      originalName: file.originalname,
      size: file.size
    };
  }
  
  async deleteFile(fileUrl) {
    try {
      const urlParts = fileUrl.split('/');
      const filename = urlParts[urlParts.length - 1].split('.')[0];
      const folder = urlParts.includes('covers') ? 'covers' : 'resources';
      await cloudinary.uploader.destroy(`resourcefull/${folder}/${filename}`);
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = new FileUploadService();