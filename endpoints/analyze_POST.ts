import superjson from "superjson";
import {
  flootAi,
  FlootAiOutOfCreditsError,
  FlootAiRateLimitError,
} from "@floot/ai";
import { schema, type OutputType } from "./analyze_POST.schema";

const analysisTool = {
  type: "function" as const,
  name: "return_environmental_analysis",
  description: "Return the complete structured EcoScan analysis for the uploaded environmental photo.",
  parameters: {
    type: "object",
    properties: {
      label: { type: "string" },
      risk: { type: "string", enum: ["Low", "Moderate", "High"] },
      urgency: { type: "string", enum: ["Monitor", "Soon", "Urgent"] },
      confidence: { type: "string" },
      summary: { type: "string" },
      whyItMatters: { type: "string" },
      evidence: { type: "array", items: { type: "string" } },
      environmentalImpact: { type: "array", items: { type: "string" } },
      humanImpact: { type: "array", items: { type: "string" } },
      likelyCauses: { type: "array", items: { type: "string" } },
      actions: { type: "array", items: { type: "string" } },
      avoid: { type: "array", items: { type: "string" } },
      prevention: { type: "array", items: { type: "string" } },
      shouldReport: { type: "boolean" },
      reportReason: { type: "string" },
    },
    required: [
      "label",
      "risk",
      "urgency",
      "confidence",
      "summary",
      "whyItMatters",
      "evidence",
      "environmentalImpact",
      "humanImpact",
      "likelyCauses",
      "actions",
      "avoid",
      "prevention",
      "shouldReport",
      "reportReason",
    ],
    additionalProperties: false,
  },
  strict: true,
};

function list(value: unknown, min: number, max: number, fallback: string[]) {
  const items = Array.isArray(value)
    ? value.map((v) => String(v).trim()).filter(Boolean).slice(0, max)
    : [];
  return items.length >= min ? items : fallback;
}

export async function handle(request: Request) {
  try {
    const raw = superjson.parse(await request.text());
    const input = schema.parse(raw);

    if (!input.imageData.startsWith("data:image/")) {
      return new Response(
        superjson.stringify({ error: "Unsupported image format." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const ai = await flootAi.chat({
      model: "gpt-6-luna",
      reasoning: { effort: "medium" },
      instructions: [
        "You are EcoScan, an environmental visual-analysis assistant for a student competition prototype.",
        "You MUST use the return_environmental_analysis function exactly once.",
        "Analyze the uploaded photo carefully and provide useful detail, not generic filler.",
        "Base conclusions on visible evidence. If a cause is uncertain, explicitly phrase it as a possibility.",
        "Do not invent exact chemicals, measurements, pathogens, legal violations, addresses, health diagnoses, or agency responsibility.",
        "Give safe advice for the public. Never tell a person to touch, taste, smell, burn, mix, enter, climb into, or personally handle potentially hazardous material.",
        "For dangerous smoke, chemicals, fire, electrical hazards, deep/fast water, sharp objects, traffic, or unknown hazardous waste: prioritize distance and professional/local-service help.",
        "Risk means severity if the visible issue is real. Urgency means how quickly action should be considered.",
        "The analysis should be detailed enough that every UI section has meaningful content.",
        "Evidence: 3-4 visible clues. Environmental impact: 3-5 points. Human impact: 2-4 points. Possible causes: 2-4 points. Actions: exactly 5 practical steps, easiest/safest first. Avoid: 2-4 points. Prevention: 3-5 points.",
        "Use clear, concise English. Do not mention internal model limitations unless uncertainty is relevant to a specific claim.",
      ].join("\n"),
      input: [
        {
          type: "message",
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Analyze this environmental photo (" +
                input.fileName +
                "). Explain what appears to be happening, why it matters, its possible impacts and causes, what to do now, what not to do, and how to prevent recurrence.",
            },
            { type: "input_image", image_url: input.imageData },
          ],
        },
      ],
      tools: [analysisTool],
      tool_choice: { type: "function", name: "return_environmental_analysis" },
      max_output_tokens: 2400,
    });

    const call = (ai.output || []).find(
      (item: any) =>
        item?.type === "function_call" &&
        item?.name === "return_environmental_analysis",
    ) as any;

    if (!call?.arguments) {
      console.error(
        "EcoScan structured analysis missing function call",
        JSON.stringify((ai.output || []).map((item: any) => ({ type: item?.type, name: item?.name }))),
      );
      return new Response(
        superjson.stringify({
          error: "AI analysis did not return a complete result. Please scan the photo again.",
          code: "INCOMPLETE_AI_RESULT",
        }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }

    const parsed = JSON.parse(call.arguments);
    const result: OutputType["result"] = {
      label: String(parsed.label || "Environmental issue").slice(0, 100),
      risk: ["Low", "Moderate", "High"].includes(parsed.risk) ? parsed.risk : "Moderate",
      urgency: ["Monitor", "Soon", "Urgent"].includes(parsed.urgency)
        ? parsed.urgency
        : "Soon",
      confidence: String(parsed.confidence || "Moderate confidence").slice(0, 130),
      summary: String(parsed.summary || "").slice(0, 900),
      whyItMatters: String(parsed.whyItMatters || "").slice(0, 1200),
      evidence: list(parsed.evidence, 2, 4, [
        "A visible environmental concern appears in the uploaded photo.",
        "The issue should be checked in context before taking action.",
      ]),
      environmentalImpact: list(parsed.environmentalImpact, 2, 5, [
        "The issue may affect nearby soil, water, air, plants, or animals.",
        "If it persists, the affected area may become harder to restore.",
      ]),
      humanImpact: list(parsed.humanImpact, 2, 4, [
        "People should avoid unnecessary contact with the affected area.",
        "Persistent pollution can reduce local environmental quality and safety.",
      ]),
      likelyCauses: list(parsed.likelyCauses, 2, 4, [
        "The exact cause cannot be confirmed from the image alone.",
        "Local waste, drainage, transport, or maintenance conditions may be relevant.",
      ]),
      actions: list(parsed.actions, 3, 5, [
        "Keep a safe distance and document the location.",
        "Take one or two additional photos from a safe position.",
        "Avoid disturbing or spreading the material.",
        "Report a persistent or serious issue to an appropriate local service.",
        "Recheck the location later to see whether the problem was resolved.",
      ]),
      avoid: list(parsed.avoid, 2, 4, [
        "Do not touch or handle unknown material without proper protection.",
        "Do not burn, wash away, or move pollution in a way that could spread it.",
      ]),
      prevention: list(parsed.prevention, 2, 5, [
        "Use proper waste collection and disposal.",
        "Keep drains, waterways, and public areas free of litter.",
        "Report recurring hotspots early before they grow.",
      ]),
      shouldReport: Boolean(parsed.shouldReport),
      reportReason: String(
        parsed.reportReason ||
          "Reporting is useful when the issue persists, spreads, or creates a public risk.",
      ).slice(0, 420),
    };

    return new Response(superjson.stringify({ result } satisfies OutputType), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    if (err instanceof FlootAiOutOfCreditsError) {
      return new Response(
        superjson.stringify({
          error: "AI analysis is temporarily unavailable.",
          code: "OUT_OF_CREDITS",
        }),
        { status: 503, headers: { "Content-Type": "application/json" } },
      );
    }

    if (err instanceof FlootAiRateLimitError) {
      return new Response(
        superjson.stringify({
          error: "Too many scans. Please wait about a minute and try again.",
          code: "RATE_LIMIT",
        }),
        { status: 429, headers: { "Content-Type": "application/json" } },
      );
    }

    console.error("EcoScan analysis failed", err);
    return new Response(
      superjson.stringify({
        error: "The image could not be analyzed. Please try another photo.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

