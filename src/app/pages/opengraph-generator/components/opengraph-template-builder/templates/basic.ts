import { style } from "@angular/animations";
import { FontData, OpenGraphData, OpenGraphTemplateBasic } from "../../../types";
import { getBackground, getBackgroundOverlayPattern, getStylesFromFontOptions, RenderFunction } from "./utils";

export const BasicRenderFn: RenderFunction = (data: Partial<OpenGraphData>) => {

  const templateProperties = data.templateProperties as OpenGraphTemplateBasic;

  const vdom = {
    type: "div",
    props: {
      children: [
        {
          type: "div",
          props: {
            "style": {
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
                  children: templateProperties.image ? {
                    type: "img",
                    props: {
                      src: templateProperties.image.url,
                      height: 96,
                      width: 96,
                      tw: "object-contain"
                    }
                  } : undefined,
                  tw: "flex flex-col gap-4"
                }
              },
              {
                type: "div",
                props: {
                  children: {
                    type: "h1",
                    props: {
                      children: templateProperties.title.value,
                      tw: "text-center grow flex justify-center items-center",
                      style: {
                        ...getStylesFromFontOptions(templateProperties.title.fontOptions)
                      }
                    }
                  },
                  tw: "flex w-full"
                }
              },
              {
                type: "div",
                props: {
                  children: {
                    type: "h1",
                    props: {
                      children: templateProperties.description.value,
                      tw: "text-center grow flex justify-center items-center",
                      style: {
                        ...getStylesFromFontOptions(templateProperties.description.fontOptions)
                      }
                    }
                  },
                  tw: "flex w-full"
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
    { fontFamily: templateProperties.description.fontOptions.fontFamily, fontWeight: templateProperties.description.fontOptions.fontWeight },
    { fontFamily: templateProperties.title.fontOptions.fontFamily, fontWeight: templateProperties.title.fontOptions.fontWeight }
  ];

  return { vdom, fontsData };

}