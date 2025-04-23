import { FontData, OpenGraphData, OpenGraphTemplateImageRight } from "@/app/pages/opengraph-generator/types";
import { getBackground, getBackgroundOverlayPattern, getStylesFromFontOptions, RenderFunction } from "./utils";

export const ImageRightRenderFn: RenderFunction = (data: Partial<OpenGraphData>) => {

    const templateProperties = data.templateProperties as OpenGraphTemplateImageRight;

    const vdom = {
        type: "div",
        props: {
            children: [
                {
                    type: "div",
                    props: {
                        style: {
                            ...getBackgroundOverlayPattern(data.gridOverlayPattern!)
                        },
                        tw: "absolute flex inset-0"
                    }
                },
                {
                    type: "div",
                    props: {
                        children: [
                            {
                                type: "div",
                                props: {
                                    children: [
                                        templateProperties.logo ? {
                                            type: "img",
                                            props: {
                                                "src": templateProperties.logo.url,
                                                "width": 64,
                                                "height": 64,
                                                tw: "mb-8"
                                            }
                                        } : {
                                            type: "div",
                                            props: {
                                                tw: "hidden"
                                            }
                                        },
                                        {
                                            type: "div",
                                            props: {
                                                children: [
                                                    {
                                                        type: "div",
                                                        props: {
                                                            children: templateProperties.tag.value ? {
                                                                type: "h1",
                                                                props: {
                                                                    children: templateProperties.tag.value ?? '',
                                                                    style: {
                                                                        ...getStylesFromFontOptions(templateProperties.tag.fontOptions),
                                                                        "borderColor": templateProperties.tag.fontOptions.fontColor
                                                                    },
                                                                    tw: "rounded-full border px-4 py-2 mb-6",
                                                                }
                                                            } : undefined,
                                                            tw: "flex"
                                                        }
                                                    },
                                                    {
                                                        type: "h1",
                                                        props: {
                                                            children: templateProperties.title.value ?? '',
                                                            style: {
                                                                ...getStylesFromFontOptions(templateProperties.title.fontOptions)
                                                            }
                                                        }
                                                    }
                                                ],
                                                tw: "mb-auto flex flex-col"
                                            }
                                        }
                                    ],
                                    tw: "flex-1 flex flex-col justify-between items-start pt-8 lg:pt-16 gap-8 p-8"
                                }
                            },
                            {
                                type: "div",
                                props: {
                                    children: templateProperties.image ? {
                                        type: "img",
                                        props: {
                                            "src": templateProperties.image.url,
                                            "width": "400",
                                            "height": "400",
                                            tw: "w-full"
                                        }
                                    } : undefined,
                                    tw: "flex-1 flex flex-col gap-4 items-end justify-end"
                                }
                            }
                        ],
                        tw: "relative z-10 top-0 left-0 flex flex-row gap-4 w-full grow"
                    }
                }
            ],
            tw: "relative flex flex-col items-center gap-4 h-full w-full pt-8",
            style: {
                background: getBackground(data.background!)
            }
        }
    }

    const fontsData: FontData[] = [
        { fontFamily: templateProperties.tag.fontOptions.fontFamily, fontWeight: templateProperties.tag.fontOptions.fontWeight },
        { fontFamily: templateProperties.title.fontOptions.fontFamily, fontWeight: templateProperties.title.fontOptions.fontWeight }
    ];

    return { vdom, fontsData };

};


