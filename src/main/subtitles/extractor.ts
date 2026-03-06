import ffmpeg from 'fluent-ffmpeg';
import { getFfmpegPath, getFfprobePath } from '../utils/ffmpeg-path';
import type { EmbeddedSubtitle } from '../../shared/types';

ffmpeg.setFfmpegPath(getFfmpegPath());
ffmpeg.setFfprobePath(getFfprobePath());

export async function probeSubtitles(videoPath: string): Promise<EmbeddedSubtitle[]> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(err);
      const subs = metadata.streams
        .filter((s) => s.codec_type === 'subtitle')
        .map((s, i) => ({
          streamIndex: i,
          language: (s.tags as Record<string, string>)?.language || 'und',
          title: (s.tags as Record<string, string>)?.title || `Track ${i + 1}`,
          codec: s.codec_name || 'unknown',
        }));
      resolve(subs);
    });
  });
}

export async function extractSubtitle(
  videoPath: string,
  streamIndex: number,
  outputPath: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .outputOptions([`-map`, `0:s:${streamIndex}`, `-c:s`, `webvtt`])
      .noAudio()
      .noVideo()
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', (err: Error) => reject(err))
      .run();
  });
}
