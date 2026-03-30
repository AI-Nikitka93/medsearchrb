import { z } from "zod";

import type { WorkerBindings } from "../env";
import { normalizeText } from "../utils/normalize";

const DEFAULT_SEARCH_AI_MODEL = "@cf/meta/llama-3.1-8b-instruct";
const DEFAULT_GROQ_SEARCH_MODEL = "qwen/qwen3-32b";
const DEFAULT_GROQ_SEARCH_FALLBACK_MODEL = "llama-3.1-8b-instant";
const SPECIALTY_CANONICAL_MAP: Record<string, string> = {
  ортопедия: "Ортопед",
  неврология: "Невролог",
  физиотерапия: "Физиотерапевт",
  кардиология: "Кардиолог",
  дерматология: "Дерматолог",
  гастроэнтерология: "Гастроэнтеролог",
  эндокринология: "Эндокринолог",
  педиатрия: "Педиатр",
  оториноларингология: "ЛОР",
  лор: "ЛОР",
  флебология: "Флеболог",
  травматология: "Травматолог",
  ревматология: "Ревматолог",
  проктология: "Проктолог",
  колопроктология: "Проктолог (колопроктолог)",
};

const QUERY_GUARDRAILS: Array<{
  keywords: string[];
  specialties: string[];
  suggestedTerms: string[];
}> = [
  {
    keywords: ["поп", "гемор", "анус", "прям", "задниц", "колопрокт"],
    specialties: ["Проктолог", "Проктолог (колопроктолог)"],
    suggestedTerms: ["проктолог", "прямая кишка"],
  },
];

const searchIntentSchema = z.enum([
  "doctor",
  "specialty",
  "clinic",
  "promo",
  "problem",
  "mixed",
]);

const searchUnderstandingSchema = z.object({
  intent: searchIntentSchema,
  normalized_query: z.string().trim().min(1).max(120),
  mapped_specialties: z.array(z.string().trim().min(1).max(80)).max(5),
  suggested_terms: z.array(z.string().trim().min(1).max(80)).max(5),
  confidence: z.number().min(0).max(1),
  reason: z.string().trim().min(1).max(240),
});

export type SearchAiProviderPreference = "auto" | "cloudflare" | "groq";
export type SearchUnderstandingResult = z.infer<typeof searchUnderstandingSchema> & {
  available: boolean;
  model: string | null;
  provider: "cloudflare" | "groq" | null;
};

function buildSearchUnderstandingPrompt(query: string) {
  return [
    "Ты помогаешь умному поиску медицинского каталога Минска.",
    "Нужно понять намерение пользователя и вернуть только JSON без markdown и пояснений.",
    "Нельзя ставить диагноз и нельзя добавлять медицинские утверждения, которых нет в запросе.",
    "Если запрос описывает жалобу или проблему, intent=problem и подбери 1-3 релевантные специальности.",
    "В mapped_specialties используй именно название врача/специалиста, например Невролог, Ортопед, Физиотерапевт, а не Неврология или Ортопедия.",
    "Если запрос похож на акцию/скидку, intent=promo.",
    "Если запрос похож на клинику, intent=clinic.",
    "Если запрос похож на конкретного врача, intent=doctor.",
    "Если запрос похож на направление, intent=specialty.",
    "Если уверенность низкая, используй mixed.",
    'Верни JSON формата: {"intent":"doctor|specialty|clinic|promo|problem|mixed","normalized_query":"...","mapped_specialties":["..."],"suggested_terms":["..."],"confidence":0.0,"reason":"..."}',
    "",
    `Запрос пользователя: ${query}`,
  ].join("\n");
}

function extractJsonBlock(value: string) {
  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI response does not contain JSON");
  }

  return value.slice(start, end + 1);
}

function extractAiText(payload: unknown): string {
  if (typeof payload === "string") {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    throw new Error("AI returned an empty response");
  }

  const record = payload as Record<string, unknown>;
  const direct =
    record.response ??
    record.result ??
    record.output_text ??
    record.text;

  if (typeof direct === "string" && direct.trim()) {
    return direct;
  }

  const candidates = [record.output, record.messages, record.content, record.generated_text];
  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) {
      continue;
    }

    const merged = candidate
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        if (item && typeof item === "object") {
          const nested = item as Record<string, unknown>;
          return [nested.text, nested.content, nested.response].find(
            (value) => typeof value === "string" && value.trim(),
          ) as string | undefined;
        }

        return undefined;
      })
      .filter((value): value is string => Boolean(value))
      .join("\n");

    if (merged.trim()) {
      return merged;
    }
  }

  throw new Error("Unable to extract text from AI response");
}

function normalizeResult(result: z.infer<typeof searchUnderstandingSchema>) {
  const canonicalSpecialties = result.mapped_specialties.map((item) => {
    const normalized = normalizeText(item);
    return SPECIALTY_CANONICAL_MAP[normalized] ?? item.trim();
  });

  return {
    ...result,
    normalized_query: normalizeText(result.normalized_query),
    mapped_specialties: Array.from(new Set(canonicalSpecialties)),
    suggested_terms: result.suggested_terms.map((item) => item.trim()),
  };
}

function applyQueryGuardrails(
  query: string,
  result: z.infer<typeof searchUnderstandingSchema>,
) {
  const normalizedQuery = normalizeText(query);

  for (const guardrail of QUERY_GUARDRAILS) {
    if (!guardrail.keywords.some((keyword) => normalizedQuery.includes(keyword))) {
      continue;
    }

    return {
      ...result,
      intent: "problem" as const,
      mapped_specialties: Array.from(
        new Set([...guardrail.specialties, ...result.mapped_specialties]),
      ).slice(0, 5),
      suggested_terms: Array.from(
        new Set([...result.suggested_terms, ...guardrail.suggestedTerms]),
      ).slice(0, 5),
      confidence: Math.max(result.confidence, 0.88),
      reason:
        "Запрос описывает деликатную проктологическую проблему, поэтому приоритетны проктологические специалисты.",
    };
  }

  return result;
}

export class SearchAiService {
  isAvailable(env: WorkerBindings) {
    return Boolean(env.AI || env.GROQ_API_KEY?.trim());
  }

  private isGroqAvailable(env: WorkerBindings) {
    return Boolean(env.GROQ_API_KEY?.trim());
  }

  async understandQuery(
    env: WorkerBindings,
    query: string,
    provider: SearchAiProviderPreference = "auto",
  ): Promise<SearchUnderstandingResult> {
    if (provider === "cloudflare") {
      return this.understandWithCloudflare(env, query);
    }

    if (provider === "groq") {
      return this.understandWithGroq(env, query);
    }

    const cloudflareResult = await this.understandWithCloudflare(env, query);
    if (!this.shouldFallbackToGroq(cloudflareResult) || !this.isGroqAvailable(env)) {
      return cloudflareResult;
    }

    const groqResult = await this.understandWithGroq(env, query);
    if (groqResult.confidence > cloudflareResult.confidence) {
      return groqResult;
    }

    return cloudflareResult;
  }

  private async understandWithCloudflare(
    env: WorkerBindings,
    query: string,
  ): Promise<SearchUnderstandingResult> {
    if (!env.AI) {
      return {
        available: false,
        model: null,
        provider: null,
        intent: "mixed",
        normalized_query: normalizeText(query),
        mapped_specialties: [],
        suggested_terms: [],
        confidence: 0,
        reason: "Workers AI binding is not configured",
      };
    }

    const model = env.AI_SEARCH_MODEL?.trim() || DEFAULT_SEARCH_AI_MODEL;

    try {
      const response = await env.AI.run(model as keyof AiModels, {
        prompt: buildSearchUnderstandingPrompt(query),
      });
      const text = extractAiText(response);
      const parsed = applyQueryGuardrails(
        query,
        normalizeResult(searchUnderstandingSchema.parse(JSON.parse(extractJsonBlock(text)))),
      );

      return {
        available: true,
        model,
        provider: "cloudflare",
        ...parsed,
      };
    } catch (error) {
      return {
        available: true,
        model,
        provider: "cloudflare",
        intent: "mixed",
        normalized_query: normalizeText(query),
        mapped_specialties: [],
        suggested_terms: [],
        confidence: 0,
        reason: error instanceof Error ? error.message : "Workers AI search understanding failed",
      };
    }
  }

  private shouldFallbackToGroq(result: SearchUnderstandingResult) {
    return !result.available || result.confidence < 0.75 || result.intent === "mixed";
  }

  private async runGroqWithModel(apiKey: string, model: string, query: string) {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 300,
        messages: [
          {
            role: "system",
            content:
              "Ты возвращаешь только JSON по заданной схеме без markdown, пояснений и префиксов.",
          },
          {
            role: "user",
            content: buildSearchUnderstandingPrompt(query),
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API failed with HTTP ${response.status}`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };

    const text = payload.choices?.[0]?.message?.content?.trim();
    if (!text) {
      throw new Error("Groq returned an empty completion");
    }

    return applyQueryGuardrails(
      query,
      normalizeResult(searchUnderstandingSchema.parse(JSON.parse(extractJsonBlock(text)))),
    );
  }

  private async understandWithGroq(
    env: WorkerBindings,
    query: string,
  ): Promise<SearchUnderstandingResult> {
    const apiKey = env.GROQ_API_KEY?.trim();
    if (!apiKey) {
      return {
        available: false,
        model: null,
        provider: null,
        intent: "mixed",
        normalized_query: normalizeText(query),
        mapped_specialties: [],
        suggested_terms: [],
        confidence: 0,
        reason: "Groq API key is not configured",
      };
    }

    const primaryModel = env.GROQ_SEARCH_MODEL?.trim() || DEFAULT_GROQ_SEARCH_MODEL;
    const fallbackModel =
      env.GROQ_SEARCH_FALLBACK_MODEL?.trim() || DEFAULT_GROQ_SEARCH_FALLBACK_MODEL;

    try {
      const parsed = await this.runGroqWithModel(apiKey, primaryModel, query);
      return {
        available: true,
        provider: "groq",
        model: primaryModel,
        ...parsed,
      };
    } catch (primaryError) {
      try {
        const parsed = await this.runGroqWithModel(apiKey, fallbackModel, query);
        return {
          available: true,
          provider: "groq",
          model: fallbackModel,
          ...parsed,
        };
      } catch (fallbackError) {
        return {
          available: true,
          provider: "groq",
          model: fallbackModel,
          intent: "mixed",
          normalized_query: normalizeText(query),
          mapped_specialties: [],
          suggested_terms: [],
          confidence: 0,
          reason:
            fallbackError instanceof Error
              ? fallbackError.message
              : primaryError instanceof Error
                ? primaryError.message
                : "Groq search understanding failed",
        };
      }
    }
  }
}
