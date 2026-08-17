import multer from 'multer';
import path from 'path';
import { USER_CONSTRAINTS } from '@dans-coding-world/shared-constants';

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

export const upload = multer({
  storage,
  limits: { fileSize: USER_CONSTRAINTS.MAX_SIZE_AVATAR_IMAGE, files: 1 },
  fileFilter: (req, file, cb) => {
    const allowed = USER_CONSTRAINTS.AVATAR_IMAGE_ALLOWED_EXTENSIONS;
    if (
      !allowed.includes(
        path.extname(
          file.originalname,
        ) as (typeof USER_CONSTRAINTS.AVATAR_IMAGE_ALLOWED_EXTENSIONS)[number],
      )
    ) {
      return cb(new Error('Invalid file type'));
    }
    cb(null, true);
  },
});
