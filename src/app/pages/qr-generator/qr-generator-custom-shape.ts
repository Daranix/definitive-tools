/*import * as QRCode from 'qrcode';

export function generateSVG(qr: QRCode.QRCode, foregroundColor: string, backgroundColor: string) {

    const size = qr.modules.size;
    const data = qr.modules.data;

    const matrix: number[][] = [];
    for (let i = 0; i < data.length; i++) {
        const col = Math.floor(i % size);
        const row = Math.floor(i / size);

        if (!matrix[row]) {
            matrix[row] = [];
        }
        matrix[row][col] = data[i];
    }

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.setAttribute("width", '100%');
    svg.setAttribute("height", '100%');
    svg.setAttribute("viewBox", `0 0 ${size} ${size}`);

    // Background
    const background = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    background.setAttribute("width", "100%");
    background.setAttribute("height", "100%");
    background.setAttribute("fill", backgroundColor);
    svg.appendChild(background);

    // Draw modules based on style
    matrix.forEach((row, y) => {
        row.forEach((cell, x) => {
            if (cell) {
                const moduleElement = createModule(x, y, foregroundColor);
                if (moduleElement) {
                    svg.appendChild(moduleElement);
                }
            }
        });
    });

    return svg;
}

function createModule(x: number, y: number, color: string) {
    const module = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    module.setAttribute("x", x.toString());
    module.setAttribute("y", y.toString());
    module.setAttribute("width", '1');
    module.setAttribute("height", '1');
    module.setAttribute("fill", color);
    return module;
}*/