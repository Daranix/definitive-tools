/// <reference lib="webworker" />

import {
  pipeline,
  TextStreamer,
  AutomaticSpeechRecognitionPipeline,
  ProgressCallback,
} from '@huggingface/transformers';

/**
 * Singleton pipeline wrapper for automatic speech recognition with Whisper
 */
class SpeechPipelineSingleton {
  private static readonly model_id = 'onnx-community/whisper-base';
  private static transcriber?: AutomaticSpeechRecognitionPipeline;
  private static device: 'webgpu' | 'wasm' = 'webgpu';

  static async getInstance(progress_callback?: ProgressCallback): Promise<AutomaticSpeechRecognitionPipeline> {
    if (!this.transcriber) {
      let hasWebGPU = false;
      if (typeof navigator !== 'undefined' && 'gpu' in navigator && (navigator as any).gpu) {
        try {
          const adapter = await (navigator as any).gpu.requestAdapter();
          hasWebGPU = !!adapter;
        } catch {
          hasWebGPU = false;
        }
      }

      this.device = hasWebGPU ? 'webgpu' : 'wasm';

      console.log(
        `%c[Whisper AI]%c Backend initialized on %c${this.device.toUpperCase()}%c (${hasWebGPU ? 'Hardware Accelerated GPU' : 'CPU via WASM'})`,
        'color: #6366f1; font-weight: bold;',
        'color: inherit;',
        `color: ${hasWebGPU ? '#10b981' : '#f59e0b'}; font-weight: bold;`,
        'color: inherit;',
      );

      this.transcriber = (await pipeline('automatic-speech-recognition', this.model_id, {
        dtype: {
          encoder_model: 'fp32',
          decoder_model_merged: 'q4',
        },
        device: this.device,
        progress_callback,
      })) as AutomaticSpeechRecognitionPipeline;
    }
    return this.transcriber;
  }

  static getDevice(): 'webgpu' | 'wasm' {
    return this.device;
  }
}

let processing = false;

async function generate({
  audio,
  language,
}: {
  audio: Float32Array<ArrayBufferLike>;
  language?: string;
}) {
  if (processing) return;
  processing = true;

  // Tell the main thread we are starting
  self.postMessage({ status: 'start' });

  try {
    const transcriber = await SpeechPipelineSingleton.getInstance();
    const device = SpeechPipelineSingleton.getDevice();

    console.log(
      `%c[Whisper AI]%c Running transcription (${(audio.length / 16000).toFixed(2)}s audio) on %c${device.toUpperCase()}%c`,
      'color: #6366f1; font-weight: bold;',
      'color: inherit;',
      `color: ${device === 'webgpu' ? '#10b981' : '#f59e0b'}; font-weight: bold;`,
      'color: inherit;',
    );

    const whisperLanguage = !language || language === 'auto' ? null : language;

    let fullStreamedText = '';
    let startTime: number | undefined;
    let numTokens = 0;

    const callback_function = (output: string) => {
      startTime ??= performance.now();

      let tps;
      if (numTokens++ > 0) {
        tps = (numTokens / (performance.now() - startTime)) * 1000;
      }

      const cleanPiece = output.replace(/<\|\d+\.\d+\|>/g, '');
      fullStreamedText += cleanPiece;

      self.postMessage({
        status: 'update',
        output: fullStreamedText.trim(),
        tps,
        numTokens,
      });
    };

    const streamer = new TextStreamer(transcriber.tokenizer, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function,
    });

    const isLongAudio = audio.length > 16_000 * 30; // > 30 seconds

    const result = await transcriber(audio, {
      language: whisperLanguage,
      return_timestamps: true,
      ...(isLongAudio ? { chunk_length_s: 30, stride_length_s: 5 } : {}),
      streamer,
    });

    const singleResult = Array.isArray(result) ? result[0] : result;
    const rawText = singleResult?.text || fullStreamedText || '';
    const cleanText = rawText.replace(/<\|\d+\.\d+\|>/g, ' ').replace(/\s+/g, ' ').trim();

    let chunks: Array<{ text: string; timestamp: [number, number | null] }> = [];

    if (Array.isArray(singleResult?.chunks)) {
      chunks = singleResult.chunks.map((c: any) => ({
        text: (c.text || '').replace(/<\|\d+\.\d+\|>/g, ' ').replace(/\s+/g, ' ').trim(),
        timestamp: [
          Math.round((c.timestamp?.[0] ?? 0) * 100) / 100,
          c.timestamp?.[1] != null ? Math.round(c.timestamp[1] * 100) / 100 : null,
        ] as [number, number | null],
      })).filter((c: any) => c.text.length > 0);
    }

    if (chunks.length === 0 && cleanText.length > 0) {
      chunks = [
        {
          text: cleanText,
          timestamp: [0, null],
        },
      ];
    }

    const captionsJson = {
      text: cleanText,
      language: whisperLanguage || 'auto',
      chunks,
    };

    self.postMessage({
      status: 'complete',
      output: cleanText,
      json: captionsJson,
      detectedLanguage: whisperLanguage || 'auto',
    });
  } catch (err: any) {
    console.error('Error during model execution in worker:', err);
    self.postMessage({
      status: 'complete',
      output: '',
      error: err?.message || 'Error occurred during model execution',
    });
  } finally {
    processing = false;
  }
}

async function load() {
  self.postMessage({
    status: 'loading',
    data: 'Loading Whisper model and WebGPU shaders...',
  });

  try {
    await SpeechPipelineSingleton.getInstance((x) => {
      self.postMessage(x);
    });

    self.postMessage({ status: 'ready' });
  } catch (err: any) {
    console.error('Failed to initialize Whisper model:', err);
    self.postMessage({
      status: 'loading',
      data: `Error loading model: ${err?.message || err}`,
    });
  }
}

// Listen for messages from the main thread
self.addEventListener('message', async (e) => {
  const { type, data } = e.data;

  switch (type) {
    case 'load':
      load();
      break;

    case 'generate':
      generate(data);
      break;
  }
});