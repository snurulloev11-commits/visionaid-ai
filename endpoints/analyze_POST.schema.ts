import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  imageData: z.string().min(32).max(4500000),
  fileName: z.string().min(1).max(180),
});

export type InputType = z.infer<typeof schema>;

export type OutputType = {
  result: {
    label: string;
    risk: "Low" | "Moderate" | "High";
    urgency: "Monitor" | "Soon" | "Urgent";
    confidence: string;
    summary: string;
    whyItMatters: string;
    evidence: string[];
    environmentalImpact: string[];
    humanImpact: string[];
    likelyCauses: string[];
    actions: string[];
    avoid: string[];
    prevention: string[];
    shouldReport: boolean;
    reportReason: string;
  };
};

export const postAnalyze = async (
  body: InputType,
  init?: RequestInit,
): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const response = await fetch("/_api/analyze", {
    method: "POST",
    body: superjson.stringify(validatedInput),
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorObject = superjson.parse<{ error?: string; code?: string }>(
      await response.text(),
    );
    const error = new Error(errorObject.error || "Analysis failed") as Error & {
      code?: string;
    };
    error.code = errorObject.code;
    throw error;
  }

  return superjson.parse<OutputType>(await response.text());
};

