import { FontData, OpenGraphData, OpenGraphTemplateHero } from "../../../types";
import { getBackground, getBackgroundOverlayPattern, getBlurBackgroundOverlay, getStylesFromFontOptions, RenderFunction } from "./utils";

export const HeroRenderFn: RenderFunction = (data: Partial<OpenGraphData>) => {

    const templateProperties = data.templateProperties as OpenGraphTemplateHero;

    const vdom = {
        type: "div",
        props: {
            children: [
                {
                    type: "div",
                    props: {
                        "style": {
                            ...getBackgroundOverlayPattern(data.gridOverlayPattern!),
                            "filter": "blur(0.5px)",
                            "backgroundPosition": "0 0, 0.65rem 0.65rem"
                        },
                        "tw": "flex absolute inset-0 z-0"
                    }
                },
                {
                    type: "div",
                    props: {
                        "style": {
                            ...getBlurBackgroundOverlay(data.gridOverlayPattern?.blurRadius ?? 0),
                            "pointerEvents": "none"
                        },
                        "tw": "flex absolute inset-0 z-0"
                    }
                },
                {
                    type: "div",
                    props: {
                        children: [
                            {
                                type: "div",
                                props: {
                                    children: {
                                        type: "h1",
                                        props: {
                                            children: templateProperties.tag.value ?? '',
                                            style: {
                                                ...getStylesFromFontOptions(templateProperties.tag.fontOptions),
                                                "borderColor": templateProperties.tag.fontOptions.fontColor
                                            },
                                            "tw": "rounded-full border px-4 py-1 mb-1"
                                        }
                                    },
                                    tw: "flex"
                                }
                            },
                            {
                                type: "h1",
                                props: {
                                    children: templateProperties.title.value ?? '',
                                    style: {
                                        ...getStylesFromFontOptions(templateProperties.title.fontOptions)
                                    },
                                    "tw": "leading-tight text-center"
                                }
                            },
                            {
                                type: "div",
                                props: {
                                    children: templateProperties.image ? {
                                        type: "img",
                                        props: {
                                            "src": templateProperties.image.url,
                                            width: 1200,
                                            height: 400,
                                            tw: "object-contain w-full"
                                        }
                                    } : undefined,
                                    "tw": "flex flex-col grow w-full items-end justify-end"
                                }
                            }
                        ],
                        "tw": "flex flex-col relative z-10 items-center w-full grow"
                    }
                }
            ],
            style: {
                background: getBackground(data.background!)
            },
            "tw": "flex flex-col items-center relative  h-full w-full pt-8"
        }
    }

    const fontsData: FontData[] = [
        { fontFamily: templateProperties.tag.fontOptions.fontFamily, fontWeight: templateProperties.tag.fontOptions.fontWeight },
        { fontFamily: templateProperties.title.fontOptions.fontFamily, fontWeight: templateProperties.title.fontOptions.fontWeight }
    ];

    return { vdom, fontsData };

}