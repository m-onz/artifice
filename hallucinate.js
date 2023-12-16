
/*

  hallucinate : m-onz

  using generative ai image-to-video ML to hallucinate extended video sequences from an initial source image.

  :

  you will need an API key from replicate.com exported to a global variable:

  export REPLICATE_API_TOKEN=r8_BRU**********************************

  tested on debian linux

  uses ffmpeg

  this costs money to run *see replicate.com pricing

  ::

  npm i
  export REPLICATE_API_TOKEN=r8_BRU**********************************
  node hallucinate.js

  ::

  wait a long time!

  ::

  You should then eventually get an "output.mp4" with a complete sequence.

  ::

  this script does not do any cleanup of generated files so you need to manually delete them

  ::

*/

const { exec, execSync } = require('child_process');
const Replicate = require('replicate');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const os = require('os');

const inputFile = './avatar.png';
const hallucinations = 5;

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

const createFileListAndConcatenate = async () => {
  const dataFolderPath = path.join(__dirname);
  try {
    await executeCommand('ls *.mp4 | awk \'{print "file \'"\'"\'"$0"\'"\'"\'"}\' > filelist.txt', { cwd: dataFolderPath });
    await executeCommand('ffmpeg -f concat -safe 0 -i filelist.txt -c copy output.mp4', { cwd: dataFolderPath });
    console.log('Concatenation completed successfully.');
  } catch (error) {
    console.error('An error occurred during concatenation:', error);
  }
};

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

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
          frames_per_second: 11
        }
      }
    );
    await downloadFile(output, filename);
  } catch (error) {
    console.error('Error converting image to video:', error);
    throw error;
  }
};

const hallucinate = async (inputImage, iterations) => {
  let currentImage = inputImage;
  for (let i = 0; i < iterations; i++) {
    const videoFilename = `./output_${i}.mp4`;
    const imageFilename = `./last_frame_${i}.png`;

    try {
      await imageToVideo(currentImage, videoFilename);
      await getLastFrame(videoFilename, imageFilename);
      currentImage = imageFilename;
    } catch (error) {
      console.error(`Error in hallucinate iteration ${i}:`, error);
      break;
    }
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

hallucinate(inputFile, hallucinations)
  .then(() => {
    console.log('Attempting concatenation...');
    return createFileListAndConcatenate();
  })
  .catch(error => {
    console.error('Hallucinate process failed:', error);
  });
