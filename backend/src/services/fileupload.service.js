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
        
        // Determine upload directory based on file type
        if (file.fieldname === 'resourceFile') {
          uploadPath += 'resources/';
        } else if (file.fieldname === 'coverPhoto') {
          uploadPath += 'covers/';
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
      coverPhoto: ['.jpg', '.jpeg', '.png']
    };
    
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (file.fieldname === 'resourceFile' && !allowedTypes.resourceFile.includes(ext)) {
      cb(new ApiError(400, 'Invalid resource file format. Allowed: PDF, MP3, MP4, JPG, PNG'), false);
      return;
    }
    
    if (file.fieldname === 'coverPhoto' && !allowedTypes.coverPhoto.includes(ext)) {
      cb(new ApiError(400, 'Invalid cover photo format. Allowed: JPG, PNG'), false);
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
  
  async uploadFile(file, directory) {
    // This is a placeholder - implement actual cloud storage upload
    // For now, return local path
    return {
      url: `/${directory}/${file.filename}`,
      format: path.extname(file.originalname).substring(1),
      filename: file.filename,
      originalName: file.originalname,
      size: file.size
    };
  }
  
  async deleteFile(fileUrl) {
    // Implement file deletion logic
    // This could be from local storage or cloud storage
    return true;
  }
}

module.exports = new FileUploadService();