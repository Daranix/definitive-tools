import { ArrowRightLeft, AtSign, Bolt, Bookmark, CaseUpper, CircleEllipsis, CircleOff, Code, Copy, Download, Grid, Grid2X2, Grid3X3, House, IdCard, Image, ImageOff, Info, Key, Link, LockKeyholeOpen, MapPin, Menu, MoveDown, MoveDownLeft, MoveDownRight, MoveLeft, MoveRight, MoveUp, MoveUpLeft, MoveUpRight, Phone, QrCode, RotateCw, Scissors, Settings, Shuffle, TabletSmartphone, Wifi, X } from 'lucide-angular';

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
    LockKeyholeOpen,
    X,
    Shuffle,
    Info,
    Image,
    MoveUp,
    MoveUpLeft,
    MoveUpRight,
    MoveDown,
    MoveDownLeft,
    MoveDownRight,
    MoveRight,
    MoveLeft,
    Menu,
    Grid3X3,
    Grid2X2,
    Grid,
    CircleEllipsis,
    CircleOff
} as const;