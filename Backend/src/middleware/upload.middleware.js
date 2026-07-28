import multer from 'multer';
import fs from 'fs';
import path from 'path';

// Ensure upload directory exists
const uploadDir = 'uploads/architecture';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Accept only PDFs and Images
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF and images are allowed.'), false);
  }
};

export const uploadArchitecture = multer({ 
  storage, 
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const qaEvidenceDir = 'uploads/qa-evidence';
if (!fs.existsSync(qaEvidenceDir)) {
  fs.mkdirSync(qaEvidenceDir, { recursive: true });
}

const evidenceStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, qaEvidenceDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'evidence-' + uniqueSuffix + path.extname(file.originalname));
  }
});

export const uploadEvidence = multer({
  storage: evidenceStorage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } //10 MB 
});


const secReportDir = 'uploads/security-reports';
if (!fs.existsSync(secReportDir)) {
  fs.mkdirSync(secReportDir, { recursive: true });
}

const secStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, secReportDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'sec-report-' + uniqueSuffix + path.extname(file.originalname));
  }
});

export const uploadSecurityReport = multer({
  storage: secStorage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});
