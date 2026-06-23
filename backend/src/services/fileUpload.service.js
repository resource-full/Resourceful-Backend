const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const ApiError = require('../utils/apiError');

class FileUploadService {
  constructor() {
    this.upload = this.configureMulter();
  }
  
  configureMulter() {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        let uploadPath = 'uploads/';
        
        if (file.fieldname === 'resourceFile') {
          uploadPath += 'resources/';
        } else if (file.fieldname === 'coverPhoto' || file.fieldname === 'coverImage') {
          uploadPath += 'covers/';
        } else if (file.fieldname === 'avatar') {
          uploadPath += 'avatars/';
        } else {
          uploadPath += 'misc/';
        }
        
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
      }
    });
    
    return multer({
      storage: storage,
      limits: {
        fileSize: 10485760 // 10MB
      },
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
    
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (file.fieldname === 'resourceFile' && !allowedTypes.resourceFile.includes(ext)) {
      cb(new ApiError(400, 'Invalid resource file format. Allowed: PDF, MP3, MP4, JPG, PNG'), false);
      return;
    }
    
    if ((file.fieldname === 'coverPhoto' || file.fieldname === 'coverImage') && !allowedTypes.coverPhoto.includes(ext)) {
      cb(new ApiError(400, 'Invalid image format. Allowed: JPG, PNG'), false);
      return;
    }
    
    if (file.fieldname === 'avatar' && !allowedTypes.avatar.includes(ext)) {
      cb(new ApiError(400, 'Invalid avatar format. Allowed: JPG, PNG'), false);
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
      url: `${directory}/${file.filename}`,
      format: path.extname(file.originalname).substring(1),
      filename: file.filename,
      originalName: file.originalname,
      size: file.size
    };
  }
  
  async deleteFile(fileUrl) {
    return true;
  }
}

module.exports = new FileUploadService();