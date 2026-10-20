import superjson from "superjson";
import {
  flootAi,
  FlootAiOutOfCreditsError,
  FlootAiRateLimitError,
} from "@floot/ai";
import { schema, type OutputType } from "./ask_POST.schema";

const answerTool = {
  type: "function" as const,
  name: "return_answer",
  description: "Return the EcoScan assistant's helpful answer to the user's question.",
  parameters: {
    type: "object",
    properties: {
      answer: { type: "string" },
    },
    required: ["answer"],
    additionalProperties: false,
  },
  strict: true,
};

export async function handle(request: Request) {
  try {
    const raw = superjson.parse(await request.text());
    const input = schema.parse(raw);

    const ai = await flootAi.chat({
      model: "gpt-6-luna",
      reasoning: { effort: "medium" },
      instructions: [
        "You are the EcoScan assistant inside an environmental photo-analysis app.",
        "You MUST use the return_answer function exactly once.",
        "Answer the user's actual question about the current uploaded photo and the detailed scan context.",
        "Understand typos, short phrases, imperfect English/Russian/Tajik, and informal wording.",
        "Use BOTH the image and the scan context. The scan context may contain useful details that are not obvious at first glance.",
        "Do not respond with generic phrases like 'I cannot produce a reliable answer' unless the question truly cannot be answered from either the image or the scan context.",
        "When something is uncertain, answer what can be said safely and explicitly state the uncertainty.",
        "Do not invent exact chemicals, pathogens, measurements, legal violations, or medical diagnoses from appearance alone.",
        "Give safe, practical environmental advice. Do not tell the user to touch, smell, taste, burn, mix, enter, climb into, or personally handle hazardous material.",
        "If there may be fire, dangerous fumes, chemicals, electrical hazards, traffic, deep/fast water, sharp objects, or immediate danger, prioritize distance and appropriate local services.",
        "Reply in the same language as the user's question. If the user mixes languages, use the dominant language.",
        "Be concrete. Usually answer in 2-4 short paragraphs or a short paragraph plus 3-6 bullets.",
        "When useful, explain: why it is harmful, what to do first, what not to do, whether reporting makes sense, and what signs would make it more urgent.",
        "Do not claim EcoScan replaces professional on-site assessment.",
      ].join("\n"),
      input: [
        {
          type: "message",
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Current detailed EcoScan result:\n" +
                input.scanContext +
                "\n\nRecent conversation about this same scan:\n" +
                (input.recentHistory || "(none)") +
                "\n\nUser question:\n" +
                input.question,
            },
            {
              type: "input_image",
              image_url: input.imageData,
            },
          ],
        },
      ],
      tools: [answerTool],
      tool_choice: { type: "function", name: "return_answer" },
      max_output_tokens: 1200,
    });

    const call = (ai.output || []).find(
      (item: any) => item?.type === "function_call" && item?.name === "return_answer",
    ) as any;

    if (!call?.arguments) {
      console.error(
        "EcoScan assistant missing function call",
        JSON.stringify((ai.output || []).map((item: any) => ({ type: item?.type, name: item?.name }))),
      );
      return new Response(
        superjson.stringify({
          error: "The assistant did not return an answer. Please ask again.",
          code: "INCOMPLETE_AI_RESULT",
        }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }

    const parsed = JSON.parse(call.arguments);
    const answer = String(parsed.answer || "").trim();
    if (!answer) {
      return new Response(
        superjson.stringify({
          error: "The assistant returned an empty answer. Please ask again.",
          code: "EMPTY_AI_RESULT",
        }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }

    const output: OutputType = { answer: answer.slice(0, 5000) };
    return new Response(superjson.stringify(output), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    if (err instanceof FlootAiOutOfCreditsError) {
      return new Response(
        superjson.stringify({
          error: "The EcoScan assistant is temporarily unavailable.",
          code: "OUT_OF_CREDITS",
        }),
        { status: 503, headers: { "Content-Type": "application/json" } },
      );
    }

    if (err instanceof FlootAiRateLimitError) {
      return new Response(
        superjson.stringify({
          error: "Too many questions. Please wait about a minute and try again.",
          code: "RATE_LIMIT",
        }),
        { status: 429, headers: { "Content-Type": "application/json" } },
      );
    }

    console.error("EcoScan assistant failed", err);
    return new Response(
      superjson.stringify({
        error: "The assistant could not answer this question. Please try again.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

