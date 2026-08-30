/// <reference lib="webworker" />

import * as tts from '@diffusionstudio/vits-web';

interface GetVoicesMessage {
  type: 'get_voices';
}

interface PredictMessage {
  type: 'predict';
  text: string;
  voiceId: tts.VoiceId;
}

type ComponentMessage = GetVoicesMessage | PredictMessage;

interface HFVoice {
  key: string;
  name: string;
  language: {
    name_english: string;
    name?: string;
    code?: string;
    country_english: string;
    region?: string;
  };
  quality: string;
}

addEventListener('message', async (event: MessageEvent<ComponentMessage>) => {
  const data = event.data;
  if (!data) return;

  if (data.type === 'get_voices') {
    try {
      const voiceList = await tts.voices() as HFVoice[];
      const supportedVoices = voiceList.filter((v: HFVoice) => !!(tts.PATH_MAP as Record<string, string>)[v.key]);
      postMessage({ type: 'voices_list', voices: supportedVoices });
    } catch (e: any) {
      postMessage({ type: 'error', message: e.message || 'Failed to fetch voices list.' });
    }
  } else if (data.type === 'predict') {
    try {
      const voicePath = (tts.PATH_MAP as Record<string, string>)[data.voiceId];

      if (!voicePath) {
        throw new Error(`Voice ID "${data.voiceId}" is not mapped to any known voice path.`);
      }

      // 1. Self-healing cache check: Clean up corrupted "Entry not found" cache files from OPFS
      try {
        const root = await navigator.storage.getDirectory();
        const piperDir = await root.getDirectoryHandle('piper');
        const jsonFileName = voicePath.split('/').at(-1) + '.json';
        const fileHandle = await piperDir.getFileHandle(jsonFileName);
        const file = await fileHandle.getFile();
        const content = await file.text();
        if (content.includes('Entry not found') || content.trim() === '') {
          await piperDir.removeEntry(jsonFileName);
        }
      } catch (e) {
        // Ignored: File not cached yet or OPFS directory not initialized
      }

      // 2. Pre-flight check: Verify that the voice config JSON is accessible online (or in cache)
      const jsonUrl = `https://huggingface.co/diffusionstudio/piper-voices/resolve/main/${voicePath}.json`;
      const res = await fetch(jsonUrl);
      if (!res.ok) {
        throw new Error(`Failed to retrieve model configuration (HTTP ${res.status}: ${res.statusText}). Please check your internet connection.`);
      }

      const blob = await tts.predict(
        {
          text: data.text,
          voiceId: data.voiceId,
        },
        (progress) => {
          postMessage({
            type: 'progress',
            loaded: progress.loaded,
            total: progress.total,
            url: progress.url,
          });
        }
      );
      postMessage({ type: 'result', audio: blob });
    } catch (e: any) {
      postMessage({ type: 'error', message: e.message || 'Speech generation failed.' });
    }
  }
});
