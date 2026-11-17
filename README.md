# Definitive Tools

Definitive Tools is a collection of free, easy-to-use online tools designed to meet various digital needs, all accessible directly from your browser—no installation required!

## Features

✅ - Already available  
⏳ - Coming soon

| Status | Feature | Description |
|--------|---------|-------------|
| ✅ | **QR Generator** | Generate QR codes quickly and easily. |
| ✅ | **QR Code Reader & Scanner** | Scan and decode QR codes from uploaded images, clipboard paste (Ctrl+V), or live camera stream. |
| ✅ | **Base64 Encode / Decode** | Convert text to and from Base64 encoding. |
| ✅ | **Image to Base64 Converter** | Convert images to Base64 data URIs and back to image files. |
| ✅ | **Background Removal Tool** | Remove backgrounds from images with ease using AI/in-browser models. |
| ✅ | **Random Password Generator** | Generate secure, randomized passwords with custom rules. |
| ✅ | **JWT Encode / Decoder & Validator** | Encode, decode, and validate JSON Web Tokens (JWTs). |
| ✅ | **Open Graph Generator** | Generate professional Opengraph images and Twitter Cards to boost social visibility. |
| ✅ | **Swagger Editor & Generator** | Edit, preview, and generate client/server SDKs locally in-browser using OpenAPI Generator CLI. |
| ✅ | **Markdown to HTML** | Convert Markdown to styled HTML with real-time preview, Mermaid diagram support, and custom CSS presets. |
| ✅ | **Markdown to Excel** | Convert Markdown tables to Excel-compatible formats easily. |
| ✅ | **Markdown to PDF** | Convert and export Markdown documents directly to PDF format. |
| ✅ | **Meme Generator** | Create custom memes with customizable text overlays and templates. |
| ✅ | **Image Format Converter** | Convert image files between PNG, JPEG, WebP, and other formats. |
| ✅ | **Text to Speech** | Convert written text into spoken audio in the browser. |
| ✅ | **Audio Editor** | Trim, cut, and process audio files locally in your browser. |
| ✅ | **Audio Speech to Text** | Transcribe spoken audio and video into text directly in the browser using local Whisper AI models. |
| ✅ | **Madrid Transport Map** | Interactive multimodal transit network and CRTM tariff zones map for Madrid (Metro, Cercanías, EMT, Interurban, Zones A-E2). |
| ⏳ | **Video Format Converter** | Convert videos to different formats. |
| ⏳ | **Image to SVG Converter** | Convert images to SVG (vector graphics) format. |
| ⏳ | **Image Upscaler** | Upscale images to higher resolutions and more details. |

## How to Use

1. Visit [Definitive Tools](https://tools.mpesteban.dev).
2. Select the tool you need.
3. Follow the simple on-screen instructions.

## Languages

The application is fully bilingual, in English and Spanish.

| Language | Home | Tool | Legal |
|----------|------|------|-------|
| English (default) | `/` | `/tool/qr-generator` | `/legal/privacy` |
| Spanish | `/es` | `/es/tool/qr-generator` | `/es/legal/privacy` |

English is the default language and never carries a URL prefix. Every other language is mounted under its language code, which keeps each translation independently addressable and indexable (`hreflang` alternates and a multilingual `sitemap.xml` are generated automatically). The URL decides the language; the visitor's explicit choice is saved so that the bare home page `/` reopens in their language.

Translations are compiled into the application bundle at build time, so server rendering and prerendering emit the correct language on the first byte.

### Working on translations

- Conventions and examples: [`docs/i18n.md`](docs/i18n.md).
- Source of truth: `src/app/i18n/messages/<language>/<namespace>.json`, one fragment per feature.
- Generated bundles: `src/app/i18n/translations/<language>.json` — never edit by hand.

```bash
npm run i18n:build                      # merge fragments into the runtime bundles
npm run i18n:check                      # verify both languages expose the same keys
node scripts/check-i18n-fragment.mjs X  # verify a single namespace
```

## Contributing

If you have suggestions for new tools or improvements, feel free to reach out or contribute to the project!

## License

This project is open-source and available under the MIT License.