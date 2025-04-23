import { FontData, OpenGraphData, OpenGraphTemplateLogos } from "../../../types";
import { getBackground, getBackgroundOverlayPattern, getStylesFromFontOptions, RenderFunction } from "./utils";

export const LogosRenderFn: RenderFunction = (data: Partial<OpenGraphData>) => {

    const templateProperties = data.templateProperties as OpenGraphTemplateLogos;


    const logos = [templateProperties.firstLogo, templateProperties.secondLogo, templateProperties.thirdLogo]
        .filter((logo) => logo !== undefined)
        .map((logo) => ({
            type: "img",
            props: {
                "src": logo.url,
                "width": 96,
                "height": 96,
                tw: "object-contain ml-4 mr-4"
            }
        }));

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
                                },

                            },
                            {
                                type: "h1",
                                props: {
                                    children: templateProperties.title.value ?? '',
                                    style: {
                                        ...getStylesFromFontOptions(templateProperties.title.fontOptions)
                                    }
                                }
                            },
                            {
                                type: "div",
                                props: {
                                    children: logos,
                                    tw: "flex flex-row gap-4 items-start justify-center mt-2"
                                }
                            }
                        ],
                        tw: "relative z-10 flex flex-col items-center justify-center gap-4 w-full grow"
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

}