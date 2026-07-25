import {
  LucideArrowRightLeft,
  LucideAtSign,
  LucideBolt,
  LucideBookmark,
  LucideBookOpen,
  LucideCaseUpper,
  LucideCheck,
  LucideCheckCircle,
  LucideChevronDown,
  LucideCircleEllipsis,
  LucideCircleOff,
  LucideClock,
  LucideCode,
  LucideColumns2,
  LucideCopy,
  LucideDownload,
  LucideFileText,
  LucideGrid,
  LucideGrid2X2,
  LucideGrid3X3,
  LucideHouse,
  LucideIdCard,
  LucideImage,
  LucideImageOff,
  LucideInfo,
  LucideKey,
  LucideLink,
  LucideLockKeyholeOpen,
  LucideMapPin,
  LucideMenu,
  LucideMonitor,
  LucideMousePointer2,
  LucideMoveDown,
  LucideMoveDownLeft,
  LucideMoveDownRight,
  LucideMoveLeft,
  LucideMoveRight,
  LucideMusic,
  LucideSplit,
  LucideMoveUp,
  LucideMoveUpLeft,
  LucideMoveUpRight,
  LucidePalette,
  LucidePause,
  LucidePhone,
  LucidePlay,
  LucidePlus,
  LucideQrCode,
  LucidePrinter,
  LucideRotateCw,
  LucideScissors,
  LucideSearch,
  LucideServer,
  LucideSettings,
  LucideShuffle,
  LucideSliders,
  LucideSmile,
  LucideTabletSmartphone,
  LucideTerminal,
  LucideTrash2,
  LucideUpload,
  LucideWifi,
  LucideX
} from '@lucide/angular';

export interface Tool {
    id: string;
    name: string;
    description: string;
    color: string;
    icon: string;
    category: string;
}

export const TOOLS: ReadonlyArray<Tool> = [
    {
        id: 'meme-generator',
        name: 'Meme Generator',
        description: 'Create funny memes with custom text overlays, drag-and-drop captions, font styling, and popular pre-set templates.',
        icon: 'smile',
        color: 'indigo',
        category: 'Image Tools'
    },
    {
        id: 'qr-generator',
        name: 'QR Code Generator',
        description: 'Create customized QR codes for URLs, text, contact information, and more. high-quality QR codes that work anywhere.',
        icon: 'qr-code',
        color: 'indigo',
        category: 'Image Tools'
    },
    {
        id: 'background-remover',
        name: 'Background Remover',
        description: 'Remove backgrounds from images instantly. Create professional-looking transparent images for your projects, products, and designs.',
        icon: 'image-off',
        color: 'indigo',
        category: 'Image Tools'
    },
    {
        id: 'image-converter',
        name: 'Image Converter',
        description: 'Convert images between different formats (PNG, JPEG, WEBP, GIF, BMP) client-side with quality and dimensions controls.',
        icon: 'image',
        color: 'indigo',
        category: 'Image Tools'
    },
    {
        id: 'image-base64-converter',
        name: 'Image Base64 Converter',
        description: 'Convert images to Base64 strings or decode Base64 data back to preview and download images. Supports multiple formats.',
        icon: 'image',
        color: 'indigo',
        category: 'Image Tools'
  },
    {
        id: 'base64-encoder-decoder',
        name: 'Base64 Encoder / Decoder',
        description: 'Easily encode text to Base64 or decode Base64 to text. Perfect for data transfer, embedding images, or working with APIs.',
        icon: 'code',
        color: 'indigo',
        category: 'Dev Tools'
    },
    {
        id: 'random-password-generator',
        name: 'Random Password Generator',
        description: 'Create strong, secure, and random passwords instantly. Customize complexity to meet different security requirements.',
        icon: 'key',
        color: 'indigo',
        category: 'Text Tools'
    },
    {
        id: 'jwt-decode-encode',
        name: 'JWT Decoder / Encoder & Validator',
        description: 'Easily encode / decode JSON Web Tokens (JWTs) and verify their signatures. Perfect for API development, authentication debugging, and token inspection.',
        icon: 'lock-keyhole-open',
        color: 'indigo',
        category: 'Dev Tools'
    },
    {
        id: 'opengraph-generator',
        name: 'Opengraph Generator',
        description: 'Create Opengraph and Twitter Cards for your websites.',
        icon: 'bolt',
        color: 'indigo',
        category: 'Image Tools'
    },
    {
        id: 'swagger-editor',
        name: 'Swagger Editor',
        description: 'Edit and visualize Swagger API specifications.',
        icon: 'bolt',
        color: 'indigo',
        category: 'Dev Tools'
    },
    {
        id: 'markdown-to-excel',
        name: 'Markdown to Excel',
        description: 'Convert Markdown tables to Excel-compatible formats easily. Copy and paste your data directly into your favorite spreadsheet software.',
        icon: 'file-text',
        color: 'indigo',
        category: 'Text Tools'
    },
    /*{
        id: 'markdown-to-pdf',
        name: 'Markdown to PDF',
        description: 'Convert Markdown text to professional PDF documents with a live preview. Perfect for documentation, notes, and quick reports.',
        icon: 'file-text',
        color: 'indigo',
        category: 'Text Tools'
    },*/
    {
        id: 'markdown-to-html',
        name: 'Markdown to HTML',
        description: 'Convert Markdown text to clean HTML code with a live preview. Style the HTML instantly using custom CSS, stylesheets, or premium design presets.',
        icon: 'code',
        color: 'indigo',
        category: 'Text Tools'
    },
    {
        id: 'audio-editor',
        name: 'Audio Editor',
        description: 'Trim, cut, and convert audio files directly in your browser. Export to MP3, WAV, OGG, AAC, and FLAC with custom bitrate and sample rate settings.',
        icon: 'music',
        color: 'indigo',
        category: 'Media Tools'
    },
    {
        id: 'text-to-speech',
        name: 'Text to Speech (TTS)',
        description: 'Convert text to spoken audio locally in your browser. Powered by VITS WebAssembly models.',
        icon: 'music',
        color: 'indigo',
        category: 'Media Tools'
    }
]

export const VALIDATION_CONSTANTS = {
    required: 'This field is required',
    minLength: 'This field must be at least {{ limit }} characters long',
    maxLength: 'This field must be at most {{ limit }} characters long',
    min: 'This field must be at least {{ limit }}',
    max: 'This field must be at most {{ limit }}',
    email: 'This field must be a valid email',
    pattern: 'This field must match the pattern {{ pattern }}',
    unique: 'This field must be unique'
} as const;

export const USED_ICONS = {
    Bolt: LucideBolt,
    QrCode: LucideQrCode,
    Link: LucideLink,
    CaseUpper: LucideCaseUpper,
    AtSign: LucideAtSign,
    Phone: LucidePhone,
    TabletSmartphone: LucideTabletSmartphone,
    IdCard: LucideIdCard,
    Wifi: LucideWifi,
    MapPin: LucideMapPin,
    Bookmark: LucideBookmark,
    Download: LucideDownload,
    Scissors: LucideScissors,
    ImageOff: LucideImageOff,
    House: LucideHouse,
    Code: LucideCode,
    ArrowRightLeft: LucideArrowRightLeft,
    Key: LucideKey,
    RotateCw: LucideRotateCw,
    Settings: LucideSettings,
    Copy: LucideCopy,
    Check: LucideCheck,
    LockKeyholeOpen: LucideLockKeyholeOpen,
    X: LucideX,
    Shuffle: LucideShuffle,
    Info: LucideInfo,
    Image: LucideImage,
    MoveUp: LucideMoveUp,
    MoveUpLeft: LucideMoveUpLeft,
    MoveUpRight: LucideMoveUpRight,
    MoveDown: LucideMoveDown,
    MoveDownLeft: LucideMoveDownLeft,
    MoveDownRight: LucideMoveDownRight,
    MoveRight: LucideMoveRight,
    MoveLeft: LucideMoveLeft,
    Menu: LucideMenu,
    Grid3X3: LucideGrid3X3,
    Grid2X2: LucideGrid2X2,
    Grid: LucideGrid,
    CircleEllipsis: LucideCircleEllipsis,
    CircleOff: LucideCircleOff,
    FileText: LucideFileText,
    ChevronDown: LucideChevronDown,
    Server: LucideServer,
    Monitor: LucideMonitor,
    MousePointer2: LucideMousePointer2,
    Upload: LucideUpload,
    BookOpen: LucideBookOpen,
    Trash2: LucideTrash2,
    Palette: LucidePalette,
    Sliders: LucideSliders,
    Columns2: LucideColumns2,
    Split: LucideSplit,
    Music: LucideMusic,
    Play: LucidePlay,
    Pause: LucidePause,
    Clock: LucideClock,
    CheckCircle: LucideCheckCircle,
    Terminal: LucideTerminal,
    Printer: LucidePrinter,
    Smile: LucideSmile,
    Plus: LucidePlus,
    Search: LucideSearch
} as const;