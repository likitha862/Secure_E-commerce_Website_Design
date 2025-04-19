

import multer from "multer";
import { v4 as uuid } from "uuid";

// 🗂️ Configure storage settings for file uploads
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, "uploads"); // store files in the /uploads directory
  },
  filename(req, file, cb) {
    const uniqueId = uuid();
    const extension = file.originalname.split(".").pop();
    const customFileName = `${uniqueId}.${extension}`;

    cb(null, customFileName);
  },
});

// 📦 Middleware to handle single file upload (field: 'file')
export const uploadFiles = multer({ storage }).single("file");
