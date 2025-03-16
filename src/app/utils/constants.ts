import { ArrowRightLeft, AtSign, Bolt, Bookmark, CaseUpper, Code, Copy, Download, Headphones, House, IdCard, ImageOff, Key, Link, MapPin, Phone, Play, QrCode, RotateCw, Scissors, Settings, Speech, StopCircle, TabletSmartphone, Wifi } from 'lucide-angular';

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
        id: 'qr-generator',
        name: 'QR Code Generator',
        description: 'Create customizable QR codes for websites, text, and more.',
        icon: 'qr-code',
        color: 'indigo',
        category: 'Image Tools'
    },
    {
        id: 'background-remover',
        name: 'Background Remover',
        description: 'Remove backgrounds from images instantly.',
        icon: 'image-off',
        color: 'indigo',
        category: 'Image Tools'
    },
    {
        id: 'base64-encoder-decoder',
        name: 'Base64 Encoder / Decoder',
        description: 'Encode and decode text or files using Base64 encoding.',
        icon: 'code',
        color: 'indigo',
        category: 'Text Tools'
    },
    {
        id: 'random-password-generator',
        name: 'Random Password Generator',
        description: 'Generate secure, randomized passwords.',
        icon: 'key',
        color: 'indigo',
        category: 'Text Tools'
    },
    {
        id: 'audio-speech-to-text',
        name: 'Audio Speech to Text',
        description: 'Convert spoken words into text efficiently.',
        icon: 'speech',
        color: 'indigo',
        category: 'Text Tools'
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
    Bolt,
    QrCode,
    Link,
    CaseUpper,
    AtSign,
    Phone,
    TabletSmartphone,
    IdCard,
    Wifi,
    MapPin,
    Bookmark,
    Download,
    Scissors,
    ImageOff,
    House,
    Code,
    ArrowRightLeft,
    Key,
    RotateCw,
    Settings,
    Copy,
    Speech,
    Headphones,
    StopCircle,
    Play
} as const;