import ffmpeg = require('fluent-ffmpeg');
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {v4 as uuidv4} from 'uuid';
import {ffmpegSettings} from './settings';

export type AudioCodec = 'aac' | 'libopus';

export function resolvePath(output: string, assetPath: string) {
  let resolvedPath: string;
  if (
    assetPath.startsWith('http://') ||
    assetPath.startsWith('https://') ||
    assetPath.startsWith('data:')
  ) {
    resolvedPath = assetPath;
  } else {
    resolvedPath = path.join(output, '../public', assetPath);
  }
  return resolvedPath;
}

export async function makeSureFolderExists(folderPath: string) {
  if (
    await fs.promises
      .access(folderPath)
      .then(() => false)
      .catch(() => true)
  ) {
    await fs.promises.mkdir(folderPath, {recursive: true});
  }
}

export async function concatenateMedia(
  files: string[],
  outputFile: string,
): Promise<void> {
  const tempFile = path.join(os.tmpdir(), `${uuidv4()}.txt`);
  const fileContent = files
    .map(file => `file '${file.replace(/'/g, "\\'")}'`)
    .join('\n');
  await fs.promises.writeFile(tempFile, fileContent);

  return new Promise((resolve, reject) => {
    ffmpeg.setFfmpegPath(ffmpegSettings.getFfmpegPath());
    const ffmpegCommand = ffmpeg();

    ffmpegCommand
      .input(tempFile)
      .inputOptions([
        '-f concat',
        '-safe 0',
        '-protocol_whitelist file,http,https,tcp,tls',
      ])
      .outputOptions(['-c copy'])
      .on('error', err => {
        console.error('Error:', err);
        fs.promises.unlink(tempFile).catch(console.error);
        reject(err); // Reject the promise on error
      })
      .on('end', () => {
        fs.promises.unlink(tempFile).catch(console.error);
        resolve(); // Resolve the promise on successful completion
      })
      .save(outputFile);
  });
}

export async function createSilentAudioFile(
  filePath: string,
  duration: number,
) {
  ffmpeg.setFfmpegPath(ffmpegSettings.getFfmpegPath());

  return new Promise((resolve, reject) => {
    ffmpeg()
      .addInput(`anullsrc=channel_layout=stereo:sample_rate=${48000}`)
      .inputFormat('lavfi')
      .duration(duration)
      .on('end', () => {
        resolve(filePath);
      })
      .on('error', err => {
        console.error('Error creating silent audio file:', err);
        reject(err);
      })
      .save(filePath);
  });
}

export async function getVideoDuration(filePath: string): Promise<number> {
  ffmpeg.setFfprobePath(ffmpegSettings.getFfprobePath());

  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }
      const duration = metadata.format.duration;
      if (duration) {
        resolve(duration);
      } else {
        reject(new Error('Could not determine video duration.'));
      }
    });
  });
}

export async function getVideoDimensions(
  filePath: string,
): Promise<{width: number; height: number}> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        console.error('Error getting video dimensions:', err);
        reject(new Error('Failed to get video dimensions'));
        return;
      }

      const videoStream = metadata.streams.find(
        stream => stream.codec_type === 'video',
      );
      if (videoStream && videoStream.width && videoStream.height) {
        resolve({
          width: videoStream.width,
          height: videoStream.height,
        });
      }
      reject(new Error('Could not find video dimensions in metadata'));
    });
  });
}

export async function doesFileExist(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function mergeAudioWithVideo(
  audioPath: string,
  videoPath: string,
  outputPath: string,
  audioCodec: AudioCodec = 'aac',
): Promise<void> {
  ffmpeg.setFfmpegPath(ffmpegSettings.getFfmpegPath());

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(videoPath)
      .input(audioPath)
      .outputOptions([
        '-c:v',
        'copy',
        '-c:a',
        audioCodec,
        '-strict',
        'experimental',
      ])
      .on('end', () => {
        resolve();
      })
      .on('error', err => {
        console.error(`Error merging video and audio: ${err.message}`);
        reject(err);
      })
      .save(outputPath);
  });
}

export async function checkForAudioStream(file: string): Promise<boolean> {
  ffmpeg.setFfprobePath(ffmpegSettings.getFfprobePath());

  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(file, (err, metadata) => {
      if (err) {
        console.error(`error checking for audioStream for file ${file}`, err);
        reject(err);
        return;
      }

      const audioStreams = metadata.streams.filter(
        s => s.codec_type === 'audio',
      );
      resolve(audioStreams.length > 0);
    });
  });
}

export async function getSampleRate(filePath: string): Promise<number> {
  ffmpeg.setFfprobePath(ffmpegSettings.getFfprobePath());

  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }
      const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
      if (audioStream && audioStream.sample_rate) {
        resolve(audioStream.sample_rate);
      } else {
        reject(new Error('No audio stream found'));
      }
    });
  });
}

export async function getVideoCodec(filePath: string) {
  ffmpeg.setFfprobePath(ffmpegSettings.getFfprobePath());

  return new Promise<string>((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }
      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      if (videoStream && videoStream.codec_name) {
        resolve(videoStream.codec_name);
      } else {
        reject(new Error('No video stream found'));
      }
    });
  });
}

export async function getVideoMetadata(
  filePath: string,
): Promise<{codec: string; width: number; height: number}> {
  ffmpeg.setFfprobePath(ffmpegSettings.getFfprobePath());

  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }
      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      if (
        videoStream &&
        videoStream.codec_name &&
        videoStream.width &&
        videoStream.height
      ) {
        resolve({
          codec: videoStream.codec_name,
          width: videoStream.width,
          height: videoStream.height,
        });
      } else {
        reject(new Error('Unable to retrieve complete video information'));
      }
    });
  });
}
