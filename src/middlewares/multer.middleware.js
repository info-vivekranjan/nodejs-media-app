import multer from "multer";
import crypto from "crypto";
import path from "path";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(process.cwd(), "public", "temp"));
  },

  filename: function (req, file, cb) {
    crypto.randomBytes(16, (err, raw) => {
      if (err) return cb(err);

      cb(null, `${file.fieldname}-${raw.toString("hex")}`);
    });
  },
});

export const upload = multer({ storage });
