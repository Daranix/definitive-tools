import { z } from "zod";

// Override Zod's default error map
export const customErrorMap: z.ZodErrorMap = (issue, ctx) => {
  // You can customize based on error code
  switch (issue.code) {
    case "invalid_type":
      if (issue.expected === "string") {
        return { message: "This field must be a text value" };
      }
      if (issue.expected === "number") {
        return { message: "This field must be a numerical value" };
      }
      if(issue.expected === "undefined" || issue.expected === "null") {
        return { message: "This field is required" };
      }
      break;
    case "too_small":
      if (issue.type === "string") {
        return { message: `This field must be at least ${issue.minimum} characters` };
      }
      if (issue.type === "number") {
        return { message: `Value must be at least ${issue.minimum}` };
      }
      break;
    case "too_big":
      if (issue.type === "string") {
        return { message: `This field cannot exceed ${issue.maximum} characters` };
      }
      break;
    case "invalid_string":
      if (issue.validation === "email") {
        return { message: "Please enter a valid email address" };
      }
      if (issue.validation === "url") {
        return { message: "Please enter a valid URL" };
      }
      break;
  }

  // Fallback to default error map
  return { message: ctx.defaultError };
};