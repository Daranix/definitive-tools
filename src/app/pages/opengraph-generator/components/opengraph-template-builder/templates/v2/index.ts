import { FontData, FontTypesDefinition, OpenGraphBackground, OpenGraphData, OpenGraphTemplateFormInputFontOptions } from "@/app/pages/opengraph-generator/types";
import satori from "satori";


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

    if(background.type === 'gradient') {
        return `linear-gradient(to ${background.direction}, ${background.color})`;
    }

    if(background.type === 'solid') {
        return background.color;
    }

    if(background.type === 'image') {
        return `url(${background.url})`;
    }

    return '';
}