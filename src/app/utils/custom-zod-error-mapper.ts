import type { core } from "zod";

// Override Zod's default error map
export const customErrorMap: core.$ZodErrorMap = (issue) => {
  // You can customize based on error code
  switch (issue.code) {
    case "invalid_type":
      if (issue.expected === "string") {
        return { message: "This field must be a text value" };
      }
      if (issue.expected === "number") {
        return { message: "This field must be a numerical value" };
      }
      if (issue.expected === "undefined" || issue.expected === "null") {
        return { message: "This field is required" };
      }
      break;
    case "too_small":
      if (issue.origin === "string") {
        return { message: `This field must be at least ${issue.minimum} characters` };
      }
      if (issue.origin === "number") {
        return { message: `Value must be at least ${issue.minimum}` };
      }
      break;
    case "too_big":
      if (issue.origin === "string") {
        return { message: `This field cannot exceed ${issue.maximum} characters` };
      }
      break;
    case "invalid_format":
      if (issue.format === "email") {
        return { message: "Please enter a valid email address" };
      }
      if (issue.format === "url") {
        return { message: "Please enter a valid URL" };
      }
      break;
  }

  // Fallback to default error map
  return undefined;
};