const fs = require('fs');
const path = require('path');

const REQ_JSON_PATH = path.join(__dirname, '../frontend/src/data/requirements.json');
const DIRS_TO_SCAN = [
  path.join(__dirname, '../frontend/src'),
  path.join(__dirname, '../backend')
];

// Regex to match @Requirement: BRD-XXX or @Req: BRD-XXX
const REQ_REGEX = /@(?:Requirement|Req):\s*(BRD-[\w.]+)/g;

function scanDir(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (file === 'node_modules' || file === 'dist' || file === '.git' || file === 'data') continue;
      scanDir(filePath, fileList);
    } else {
      const ext = path.extname(file);
      if (['.js', '.jsx', '.ts', '.tsx', '.py'].includes(ext)) {
        fileList.push(filePath);
      }
    }
  }
  return fileList;
}

function run() {
  console.log('Starting requirement scan...');
  
  if (!fs.existsSync(REQ_JSON_PATH)) {
    console.error('Requirements JSON not found at:', REQ_JSON_PATH);
    process.exit(1);
  }

  const requirements = JSON.parse(fs.readFileSync(REQ_JSON_PATH, 'utf-8'));
  const allFiles = [];
  for (const dir of DIRS_TO_SCAN) {
    scanDir(dir, allFiles);
  }

  // Reset files and set status to pending initially
  const reqMap = new Map();
  requirements.forEach(req => {
    req.files = [];
    req.status = 'Pending';
    reqMap.set(req.id, req);
  });

  allFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    let match;
    while ((match = REQ_REGEX.exec(content)) !== null) {
      const reqId = match[1];
      if (reqMap.has(reqId)) {
        const req = reqMap.get(reqId);
        const relPath = path.relative(path.join(__dirname, '..'), file);
        if (!req.files.includes(relPath)) {
          req.files.push(relPath);
        }
        req.status = 'Implemented';
      }
    }
  });

  fs.writeFileSync(REQ_JSON_PATH, JSON.stringify(requirements, null, 2));
  console.log('Requirements synced successfully.');
}

run();
