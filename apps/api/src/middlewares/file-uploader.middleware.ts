import multer from 'multer';
import path from 'path';

const root = process.env.NX_WORKSPACE_ROOT;
if (!root) throw new Error('Missing nx env variable');

const PATH_TO_IMAGES = path.join(root, 'uploads');

const storage = multer.diskStorage({
  destination: PATH_TO_IMAGES,
  filename: function (_, file, cb) {
    const fileExtension = path.extname(file.originalname);
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const finalFilename = uniqueName + fileExtension;
    cb(null, finalFilename);
  },
});

export const upload = multer({ storage });
