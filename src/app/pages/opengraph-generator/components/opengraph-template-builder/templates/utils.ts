import { BackgroundOverlayPattern } from "../../../constants";
import { FontData, OpenGraphBackground, OpenGraphBackgroundOverlay, OpenGraphData, OpenGraphTemplateFormInputFontOptions } from "../../../types";


export interface VNode {
    type: string;
    props: {
        tw?: string;
        style?: Record<string, any>;
        children?: string | VNode | VNode[];
        [prop: string]: any;
    };
}

export type RenderFunction = (data: Partial<OpenGraphData>) => { vdom: VNode, fontsData: FontData[] };

export function getStylesFromFontOptions(fontOptions: OpenGraphTemplateFormInputFontOptions) {
    return {
        fontFamily: fontOptions.fontFamily.label,
        fontWeight: fontOptions.fontWeight,
        fontSize: fontOptions.fontSize + 'px',
        color: fontOptions.fontColor
    };
}

export function getBackground(background: OpenGraphBackground) {

    if (background.type === 'gradient') {
        return `linear-gradient(to ${background.direction}, ${background.color})`;
    }

    if (background.type === 'solid') {
        return background.color;
    }

    if (background.type === 'image') {
        return `url(${background.url})`;
    }

    return '';
}

export function getBlurBackgroundOverlay(blurRadius: OpenGraphBackgroundOverlay['blurRadius']) {
    const MAX_BLUR_PIXELS = 200;
    const pixels = (MAX_BLUR_PIXELS * blurRadius) / 100;
    return { boxShadow: `inset 0 0 40px ${pixels}px rgba(255, 255, 255, 0.3)` }
}


type BackgroundOverlaySomePattern = Exclude<BackgroundOverlayPattern, 'none'>;


const GRID_PATTERN = (color: string, opacity: number) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
            <g fill="none" opacity="${opacity / 100}">
            <path d="M48 47.5001L0 47.5001" stroke="${color}"/>
            <path d="M47.5 0V48" stroke="${color}"/>
        </g>
        </svg>`.trim();

    return `url(data:image/svg+xml;base64,${btoa(svg)})`;
};

const DOTS_PATTERN = (color: string, opacity: number) => {
    const svg = `<svg
        width="20px"
        height="20px"
        viewBox="0 0 20 20"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        xmlns:xlink="http://www.w3.org/1999/xlink"
    >
        <defs></defs>
        <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
            <g id="dots" fill="${color}" fill-opacity="${opacity / 100}">
            <circle cx="3" cy="3" r="3"></circle>
            <circle cx="13" cy="13" r="3"></circle>
            </g>
        </g>
    </svg>`.trim();

    return `url(data:image/svg+xml;base64,${btoa(svg)})`;
};

const GRAPH_PATTERN = (color: string, opacity: number) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
            <g fill-rule="evenodd" fill="${color}" fill-opacity="${opacity / 100}">
                <g>
                    <path opacity=".5" d="M96 95h4v1h-4v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9zm-1 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm9-10v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9z"/>
                    <path d="M6 5V0H5v5H0v1h5v94h1V6h94V5H6z"/>
                </g>
            </g>
        </svg>`.trim();

    return `url(data:image/svg+xml;base64,${btoa(svg)})`;
};


const PATTERN_CONFIGURATION_PROPERTIES = {
    'grid': {
        backgroundImage: GRID_PATTERN,
        backgroundSize: "20px 20px"
    },
    'dots': {
        backgroundImage: DOTS_PATTERN,
        backgroundSize: "20px 20px",
        backgoundRepeat: "repeat"
    },
    'graph': {
        backgroundImage: GRAPH_PATTERN,
        backgroundSize: "100px 100px"
    }
} as const satisfies Record<BackgroundOverlaySomePattern, any>;

export function getBackgroundOverlayPattern(backgroundOverlay: OpenGraphBackgroundOverlay) {

    if(backgroundOverlay.pattern === 'none') {
        return {};
    }

    const backgroundImage = PATTERN_CONFIGURATION_PROPERTIES[backgroundOverlay.pattern].backgroundImage(backgroundOverlay.color, backgroundOverlay.opacity);
    return {
        ...PATTERN_CONFIGURATION_PROPERTIES[backgroundOverlay.pattern],
        backgroundImage,
        backgroundOpacity: backgroundOverlay.opacity,
        maskImage: `radial-gradient(circle, black ${100 - backgroundOverlay.blurRadius}%, transparent 80%)`
    };
}