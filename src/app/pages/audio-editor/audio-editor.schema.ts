import z from "zod";

export const AUDIO_FORMATS = ['mp3', 'wav', 'ogg', 'aac', 'flac'] as const;
export type AudioFormat = typeof AUDIO_FORMATS[number];

export const AUDIO_SAMPLE_RATES = [22050, 44100, 48000] as const;
export type AudioSampleRate = typeof AUDIO_SAMPLE_RATES[number];

export const AUDIO_BITRATE_OPTIONS = [64, 128, 192, 256, 320] as const;
export type AudioBitrate = typeof AUDIO_BITRATE_OPTIONS[number];

export const audioSchema = z.object({
    file: z.custom<File | null>((val) => val === null || val instanceof File),
    targetFormat: z.enum(AUDIO_FORMATS),
    bitrate: z.number().int().refine(
        (v) => (AUDIO_BITRATE_OPTIONS as readonly number[]).includes(v),
        { message: 'Bitrate must be one of ' + AUDIO_BITRATE_OPTIONS.join(', ') },
    ),
    sampleRate: z.number().int().refine(
        (v) => (AUDIO_SAMPLE_RATES as readonly number[]).includes(v),
        { message: 'Sample rate must be one of ' + AUDIO_SAMPLE_RATES.join(', ') },
    ),
    trimStart: z.number().min(0),
    trimEnd: z.number().min(0),
}).refine(
    (data) => data.trimEnd > data.trimStart + 0.05,
    { message: 'End must be after start', path: ['trimEnd'] },
);



export type AudioSchema = z.infer<typeof audioSchema>;