import { BackgroundOverlayPattern, GradientDirection } from "./constants";

export interface OpenGraphData {
    background: OpenGraphBackground;
    templateProperties: OpenGraphTemplate;
    gridOverlayPattern: OpenGraphBackgroundOverlay;
}

export type OpenGraphTemplate = OpenGraphTemplateImageRight | OpenGraphTemplateHero | OpenGraphTemplateLogos | OpenGraphTemplateBasic | OpenGraphTemplateNotice;
export type OpenGraphBackground = OpenGraphBackgroundGradient | OpenGraphBackgroundSolid | OpenGraphBackgroundImage;
export type OpenGraphImage = { name: string, url: string };

export type OpenGraphTemplateImageRight = {
    type: 'image-right';
    tag: {
        value: string;
        fontOptions: OpenGraphTemplateFormInputFontOptions;
    };
    title: {
        value: string;
        fontOptions: OpenGraphTemplateFormInputFontOptions;
    };
    logo?: OpenGraphImage;
    image?: OpenGraphImage;
};

export type OpenGraphTemplateHero = {
    type: 'hero';
    tag: {
        value: string;
        fontOptions: OpenGraphTemplateFormInputFontOptions;
    };
    title: {
        value: string;
        fontOptions: OpenGraphTemplateFormInputFontOptions;
    };
    image?: OpenGraphImage;
};

export type OpenGraphTemplateLogos = {
    type: 'logos';
    tag: {
        value: string;
        fontOptions: OpenGraphTemplateFormInputFontOptions;
    };
    title: {
        value: string;
        fontOptions: OpenGraphTemplateFormInputFontOptions;
    };
    firstLogo?: OpenGraphImage;
    secondLogo?: OpenGraphImage;
    thirdLogo?: OpenGraphImage;
};

export type OpenGraphTemplateBasic = {
    type: 'basic';
    tag: {
        value: string;
        fontOptions: OpenGraphTemplateFormInputFontOptions;
    };
    title: {
        value: string;
        fontOptions: OpenGraphTemplateFormInputFontOptions;
    };
    image: string;
};

export type OpenGraphTemplateNotice = {
    type: 'notice';
    title: {
        value: string;
        fontOptions: OpenGraphTemplateFormInputFontOptions;
    };
    description: {
        value: string;
        fontOptions: OpenGraphTemplateFormInputFontOptions;
    };
    logo: string;
};

export type OpenGraphTemplateFormInputFontOptions = {
    fontFamily: FontTypesDefinition;
    fontWeight: OpenGraphFontWeight;
    fontSize: number;
    fontColor: string;
};

export type OpenGraphBackgroundGradient = {
    type: 'gradient';
    color: string | string[];
    direction: GradientDirection;
};

export type OpenGraphBackgroundSolid = {
    type: 'solid';
    color: string;
};

export type OpenGraphBackgroundImage = {
    type: 'image';
    url: string;
};

export type OpenGraphBackgroundOverlay = {
    pattern: BackgroundOverlayPattern;
    color: string;
    opacity: number;
    blurRadius: number;
}

export type OpenGraphFontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

export interface FontTypesDefinition {
    key: string;
    label: string;
    lang?: string;
}

export interface FontData {
    fontFamily: FontTypesDefinition;
    fontWeight: OpenGraphFontWeight;
}

export interface SatoriFontOptions {
    data: Buffer | ArrayBuffer;
    name: string;
    weight?: OpenGraphFontWeight;
    style?: "normal" | "italic";
    lang?: string;
}