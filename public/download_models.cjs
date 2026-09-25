const fs = require('fs');
const https = require('https');
const path = require('path');

const modelsDir = path.join(__dirname, 'models');

if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
}

const baseUrl = 'https://raw.githubusercontent.com/vladmandic/face-api/master/model/';
const files = [
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model-shard1',
  'ssd_mobilenetv1_model-shard2',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2'
];

const downloadFile = (file) => {
  return new Promise((resolve, reject) => {
    const dest = path.join(modelsDir, file);
    if (fs.existsSync(dest)) {
        console.log(`${file} already exists, skipping...`);
        return resolve();
    }
    const fileStream = fs.createWriteStream(dest);
    
    https.get(baseUrl + file, (res) => {
      if (res.statusCode !== 200) {
          reject(new Error(`Failed to get '${file}' (${res.statusCode})`));
          return;
      }
      res.pipe(fileStream);
      
      fileStream.on('finish', () => {
        fileStream.close();
        console.log(`Downloaded ${file}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
};

const run = async () => {
  console.log('Downloading face-api models...');
  for (const file of files) {
    try {
      await downloadFile(file);
    } catch (err) {
      console.error(err.message);
    }
  }
  console.log('Done!');
};

run();
