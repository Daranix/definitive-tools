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
        icon: 'https://github.com/mpesteban/definitive-tools/blob/main/src/assets/qr-code-generator.png?raw=true',
        color: 'indigo',
        category: 'Image Tools'
    }
]