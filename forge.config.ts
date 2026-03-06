import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

const config: ForgeConfig = {
  packagerConfig: {
    appBundleId: 'com.retrocast.app',
    icon: './build/icon',
    asar: true,
    extraResource: [
      './node_modules/ffmpeg-static/ffmpeg',
      './node_modules/ffprobe-static/bin',
    ],
    extendInfo: {
      CFBundleDocumentTypes: [
        {
          CFBundleTypeName: 'Video File',
          CFBundleTypeRole: 'Viewer',
          CFBundleTypeIconFile: 'electron',
          CFBundleTypeExtensions: ['mp4', 'mkv', 'webm', 'avi', 'mov'],
          LSItemContentTypes: [
            'public.movie',
            'public.video',
            'com.apple.quicktime-movie',
            'public.mpeg-4',
            'org.matroska.mkv',
            'org.webmproject.webm',
            'public.avi',
          ],
          LSHandlerRank: 'Owner',
        },
        {
          CFBundleTypeName: 'Audio File',
          CFBundleTypeRole: 'Viewer',
          CFBundleTypeIconFile: 'electron',
          CFBundleTypeExtensions: ['mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg'],
          LSItemContentTypes: [
            'public.audio',
            'public.mp3',
            'com.apple.m4a-audio',
            'org.xiph.flac',
            'public.aac-audio',
            'org.xiph.ogg-vorbis',
            'com.microsoft.waveform-audio',
          ],
          LSHandlerRank: 'Owner',
        },
      ],
      UTImportedTypeDeclarations: [
        {
          UTTypeIdentifier: 'org.matroska.mkv',
          UTTypeDescription: 'Matroska Video',
          UTTypeIconFile: 'electron',
          UTTypeConformsTo: ['public.movie'],
          UTTypeTagSpecification: { 'public.filename-extension': ['mkv'], 'public.mime-type': ['video/x-matroska'] },
        },
        {
          UTTypeIdentifier: 'org.webmproject.webm',
          UTTypeDescription: 'WebM Video',
          UTTypeIconFile: 'electron',
          UTTypeConformsTo: ['public.movie'],
          UTTypeTagSpecification: { 'public.filename-extension': ['webm'], 'public.mime-type': ['video/webm'] },
        },
        {
          UTTypeIdentifier: 'org.xiph.flac',
          UTTypeDescription: 'FLAC Audio',
          UTTypeIconFile: 'electron',
          UTTypeConformsTo: ['public.audio'],
          UTTypeTagSpecification: { 'public.filename-extension': ['flac'], 'public.mime-type': ['audio/flac'] },
        },
        {
          UTTypeIdentifier: 'org.xiph.ogg-vorbis',
          UTTypeDescription: 'Ogg Vorbis Audio',
          UTTypeIconFile: 'electron',
          UTTypeConformsTo: ['public.audio'],
          UTTypeTagSpecification: { 'public.filename-extension': ['ogg'], 'public.mime-type': ['audio/ogg'] },
        },
      ],
    },
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({}),
    new MakerZIP({}, ['darwin']),
    new MakerRpm({}),
    new MakerDeb({}),
  ],
  plugins: [
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: 'src/main.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: false,
    }),
  ],
};

export default config;
