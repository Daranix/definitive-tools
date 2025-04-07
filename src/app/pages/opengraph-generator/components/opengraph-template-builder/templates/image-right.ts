import { FontData, OpenGraphData, OpenGraphTemplateImageRight } from "@/app/pages/opengraph-generator/types";
import { getBackground, getStylesFromFontOptions, RenderFunction } from "./utils";

export const ImageRightRenderFn: RenderFunction = (data: Partial<OpenGraphData>) => {

    const templateProperties = data.templateProperties as OpenGraphTemplateImageRight;

    
    const vdom = {
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
                                    "tw": "mb-8"
                                }
                            } : {
                                type: "div",
                                props: {
                                    "tw": "hidden"
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
                                                        "tw": "rounded-full border border-black px-4 py-2 mb-6",
                                                        style: {
                                                            ...getStylesFromFontOptions(templateProperties.tag.fontOptions)
                                                        }
                                                    }
                                                } : undefined,
                                                "tw": "flex"
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
                                    "tw": "mb-auto flex flex-col"
                                }
                            }
                        ],
                        "tw": "flex-1 flex flex-col justify-between p-8"
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
                                "tw": "w-full"
                            }
                        } : undefined,
                        "tw": "flex-1 flex flex-col items-end justify-end"
                    }
                }
            ],
            style: {
                background: getBackground(data.background!)
            },
            "tw": "flex grow h-full w-full"
        }
    }

    const fontsData: FontData[] = [
        { fontFamily: templateProperties.tag.fontOptions.fontFamily, fontWeight: templateProperties.tag.fontOptions.fontWeight },
        { fontFamily: templateProperties.title.fontOptions.fontFamily, fontWeight: templateProperties.title.fontOptions.fontWeight }
    ];

    return { vdom, fontsData };

};


