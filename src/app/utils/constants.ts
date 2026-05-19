import { ArrowRightLeft, AtSign, Bolt, Bookmark, BookOpen, CaseUpper, Check, ChevronDown, CircleEllipsis, CircleOff, Code, Copy, Download, FileText, Grid, Grid2X2, Grid3X3, House, IdCard, Image, ImageOff, Info, Key, Link, LockKeyholeOpen, MapPin, Menu, Monitor, MousePointer2, MoveDown, MoveDownLeft, MoveDownRight, MoveLeft, MoveRight, MoveUp, MoveUpLeft, MoveUpRight, Palette, Phone, QrCode, RotateCw, Scissors, Server, Settings, Shuffle, Sliders, TabletSmartphone, Trash2, Upload, Wifi, X } from 'lucide-angular';

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
    Check,
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
    CircleOff,
    FileText,
    ChevronDown,
    Server,
    Monitor,
    MousePointer2,
    Upload,
    BookOpen,
    Trash2,
    Palette,
    Sliders
} as const;