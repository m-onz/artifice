
// m-onz : hallucinate.js

const { exec, execSync } = require('child_process');
const Replicate = require('replicate');
const crypto = require('crypto');
const mkdirp = require('mkdirp');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const os = require('os');

const hallucinations = 1;

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

function checkEnvironment() {
  if (os.platform() !== 'linux') {
    console.error('Error: This script is only supported on Linux systems.');
    process.exit(1);
  }
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
  } catch (error) {
    console.error('Error: ffmpeg is not installed or not found in PATH.');
    process.exit(1);
  }
}

checkEnvironment();

const executeCommand = async (command, options) => {
  return new Promise((resolve, reject) => {
    exec(command, options, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        return reject(error);
      }
      if (stderr) {
        console.error(`Stderr: ${stderr}`);
        return reject(stderr);
      }
      resolve(stdout);
    });
  });
};

const createFileListAndConcatenate = async (folderId) => {
  const dataFolderPath = path.join(__dirname, folderId);
  try {
    if (!fs.existsSync(dataFolderPath)) {
      throw new Error(`Folder does not exist: ${dataFolderPath}`);
    }
    const files = fs.readdirSync(dataFolderPath)
                    .filter(file => file.endsWith('.mp4'))
                    .map(file => `file '${file}'`)
                    .join('\n');
    fs.writeFileSync(path.join(dataFolderPath, 'filelist.txt'), files);
    await executeCommand(`ffmpeg -f concat -safe 0 -i filelist.txt -c copy output_finished.mp4`, { cwd: dataFolderPath });
    console.log('Concatenation completed successfully.');
  } catch (error) {
    console.error('An error occurred during concatenation:', error);
  }
};

const downloadFile = async (url, filepath) => {
  try {
    const response = await axios.get(url, { responseType: 'stream' });
    const writer = fs.createWriteStream(filepath);
    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(checkFileReady(filepath)));
      writer.on('error', reject);
    });
  } catch (error) {
    console.error(`Error downloading file from ${url}: `, error);
    throw error;
  }
};

const getLastFrame = async (video, filename) => {
  const data = fs.readFileSync(video);
  const base64 = data.toString('base64');
  const mimeType = 'image/png';
  const dataURI = `data:${mimeType};base64,${base64}`;
  try {
    const output = await replicate.run(
      "fofr/video-to-frames:ad9374d1b385c86948506b3ad287af9fca23e796685221782d9baa2bc43f14a9", {
        input: {
          fps: 1,
          video: dataURI,
          extract_all_frames: false
        }
      }
    );
    const lastURL = output[output.length - 1];
    await downloadFile(lastURL, filename);
  } catch (error) {
    console.error('Error getting the last frame:', error);
    throw error;
  }
};

const imageToVideo = async (image, filename) => {
  const data = fs.readFileSync(image);
  const base64 = data.toString('base64');
  const mimeType = 'image/png';
  const dataURI = `data:${mimeType};base64,${base64}`;
  try {
    const output = await replicate.run(
      "stability-ai/stable-video-diffusion:3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438", {
        input: {
          input_image: dataURI,
          // video_length: "25_frames_with_svd_xt",
          // sizing_strategy: "maintain_aspect_ratio",
          motion_bucket_id: 127
          // frames_per_second: 30
        }
      }
    );
    await downloadFile(output, filename);
  } catch (error) {
    console.error('Error converting image to video:', error);
    throw error;
  }
};

const checkFileReady = (filePath, timeout = 30000, interval = 500) => {
  return new Promise((resolve, reject) => {
    let lastSize = -1;
    let totalTime = 0;
    const checkInterval = setInterval(() => {
      if (!fs.existsSync(filePath)) {
        totalTime += interval;
        if (totalTime >= timeout) {
          clearInterval(checkInterval);
          reject(new Error(`File ${filePath} did not appear within ${timeout}ms`));
        }
        return;
      }
      const stats = fs.statSync(filePath);
      if (stats.size === lastSize) {
        clearInterval(checkInterval);
        resolve();
      } else {
        lastSize = stats.size;
      }
    }, interval);
  });
};

const hallucinate = async (inputImagePath, iterations, imageIndex) => {
  const hallucinationFolder = `./data/hallucination_${imageIndex}`;
  mkdirp.sync(hallucinationFolder);
  let currentImagePath = inputImagePath;
  console.log(`Starting hallucination for image: ${inputImagePath}`);
  for (let i = 0; i < iterations; i++) {
    const videoFilename = path.join(hallucinationFolder, `output_${i}.mp4`);
    const imageFilename = path.join(hallucinationFolder, `last_frame_${i}.png`);
    console.log(`Iteration ${i}, ${inputImagePath} current image: ${currentImagePath}`);
    console.log(`Creating video: ${videoFilename}, ${inputImagePath} Next image: ${imageFilename}`);
    try {
      await imageToVideo(currentImagePath, videoFilename);
      await getLastFrame(videoFilename, imageFilename);
      currentImagePath = imageFilename; // Update the current image path for the next iteration
    } catch (error) {
      console.error(`Error in hallucinate iteration ${i}:`, error);
      break;
    }
  }
  return hallucinationFolder
};

const processImages = async (image_folder) => {
  const images = listImageFiles(image_folder);
  console.log(`Found ${images.length} images to process:`, images);
  const hallucinatePromises = images.map((image, index) => {
    console.log(`Processing image ${index}: ${image}`);
    return hallucinate(image, hallucinations, index);
  });

  try {
    const folders = await Promise.all(hallucinatePromises);
    for (const folder of folders) {
      await createFileListAndConcatenate(folder);
    }
    console.log('All images processed.');
  } catch (error) {
    console.error('An error occurred during image processing:', error);
  }
};

const listImageFiles = (folderPath) => {
  return fs.readdirSync(folderPath)
           .filter(file => /\.(png|jpe?g)$/i.test(file))
           .map(file => path.join(folderPath, file));
};

processImages('./images')
  .then(() => {
    console.log('All images processed.');
  })
  .catch(error => {
    console.error('Hallucinate process failed:', error);
  });
