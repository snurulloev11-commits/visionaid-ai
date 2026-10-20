import { z } from "zod";
import superjson from "superjson";

export const schema = z.object({
  question: z.string().trim().min(2).max(700),
  imageData: z.string().min(32).max(4500000),
  scanContext: z.string().min(2).max(16000),
  recentHistory: z.string().max(7000).default(""),
});

export type InputType = z.infer<typeof schema>;

export type OutputType = {
  answer: string;
};

export const postAsk = async (
  body: InputType,
  init?: RequestInit,
): Promise<OutputType> => {
  const validatedInput = schema.parse(body);
  const response = await fetch("/_api/ask", {
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
    const error = new Error(errorObject.error || "Assistant request failed") as Error & {
      code?: string;
    };
    error.code = errorObject.code;
    throw error;
  }

  return superjson.parse<OutputType>(await response.text());
};

