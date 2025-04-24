import { style } from "@angular/animations";
import { FontData, OpenGraphData, OpenGraphTemplateBasic, OpenGraphTemplateNotice } from "../../../types";
import { getBackground, getBackgroundOverlayPattern, getStylesFromFontOptions, RenderFunction } from "./utils";

export const NoticeRenderFn: RenderFunction = (data: Partial<OpenGraphData>) => {

  const templateProperties = data.templateProperties as OpenGraphTemplateNotice;

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
                  children: templateProperties.logo ? {
                    type: "img",
                    props: {
                      "src": templateProperties.logo.url,
                      "alt": "Image example",
                      "height": 96,
                      "width": 96,
                      tw: "object-contain"
                    }
                  } : undefined,
                  tw: "flex flex-col"
                }
              },
              {
                type: "div",
                props: {
                  children: [
                    {
                      type: "h1",
                      props: {
                        children: templateProperties.title.value,
                        tw: "text-center items-end grow",
                        style: {
                          ...getStylesFromFontOptions(templateProperties.title.fontOptions)
                        }
                      }
                    },
                    {
                      type: "h1",
                      props: {
                        children: templateProperties.description.value,
                        tw: "text-center grow mt-[-0.5rem]",
                        style: {
                          ...getStylesFromFontOptions(templateProperties.description.fontOptions)
                        }
                      }
                    }
                  ],
                  tw: "flex flex-col ml-8 gap-0"
                }
              }
            ],
            tw: "relative z-10 flex flex-row items-center justify-center w-full grow"
          }
        }
      ],
      tw: "relative flex flex-col items-center h-full w-full",
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