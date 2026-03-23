import { z } from "zod";

import type { WorkerBindings } from "../env";
import { parsePromotionDate, promotionIsExpired } from "../utils/promotion-status";

const DEFAULT_PROMOTION_AI_MODEL = "@cf/meta/llama-3.1-8b-instruct";
const DEFAULT_GROQ_PROMO_MODEL = "qwen/qwen3-32b";
const DEFAULT_GROQ_PROMO_FALLBACK_MODEL = "llama-3.1-8b-instant";

const aiPromotionAuditSchema = z.object({
  status: z.enum(["active", "ended", "uncertain"]),
  confidence: z.number().min(0).max(1),
  reason: z.string().min(1).max(500),
  suggested_title: z.string().trim().min(1).max(160).nullable(),
  suggested_body: z.string().trim().min(1).max(500).nullable(),
});

export type PromotionAiAuditInput = {
  title: string;
  clinicName?: string | null;
  sourceName?: string | null;
  sourceUrl: string;
  endsAt?: string | null;
  pageText?: string | null;
};

export type PromotionAiProviderPreference = "auto" | "cloudflare" | "groq";

export type PromotionAiAuditResult = z.infer<typeof aiPromotionAuditSchema> & {
  available: boolean;
  model: string | null;
  provider: "cloudflare" | "groq" | null;
};

function extractJsonBlock(value: string) {
  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Workers AI response does not contain JSON");
  }

  return value.slice(start, end + 1);
}

function extractAiText(payload: unknown): string {
  if (typeof payload === "string") {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    throw new Error("Workers AI returned an empty response");
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

  const candidates = [
    record.output,
    record.messages,
    record.content,
    record.generated_text,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      const merged = candidate
        .map((item) => {
          if (typeof item === "string") {
            return item;
          }

          if (item && typeof item === "object") {
            const nested = item as Record<string, unknown>;
            return [nested.text, nested.content, nested.response]
              .find((value) => typeof value === "string" && value.trim()) as string | undefined;
          }

          return undefined;
        })
        .filter((value): value is string => Boolean(value))
        .join("\n");

      if (merged.trim()) {
        return merged;
      }
    }
  }

  throw new Error("Unable to extract text from Workers AI response");
}

function buildPromotionAuditPrompt(input: PromotionAiAuditInput, pageText: string) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Minsk",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const parsedEndsAt = parsePromotionDate(input.endsAt);
  const endsAtState = !input.endsAt
    ? "missing"
    : promotionIsExpired(input.endsAt)
      ? "expired"
      : parsedEndsAt
        ? "future"
        : "unparsed";

  return [
    "Ты проверяешь акцию частной клиники для Telegram-канала.",
    "Нужно быть очень консервативным: если есть сомнение, выбирай uncertain, а не active.",
    "Считай ended, если акция явно завершена, срок истек, это архивная новость/старый анонс или условия больше не выглядят актуальными.",
    "Считай active только если текст реально выглядит как действующая акция сейчас.",
    `Сегодняшняя дата: ${today}.`,
    "Если в тексте есть только старые даты публикации/вступления в силу за прошлые месяцы или прошлый год, а свежего дедлайна или явного признака действия сейчас нет, выбирай ended.",
    "Не считай страницу active только потому, что на ней когда-то было написано 'уже действует'. Важно, действует ли это предложение сейчас относительно сегодняшней даты.",
    "Если указан будущий дедлайн, который еще не наступил относительно сегодняшней даты, это аргумент против статуса ended.",
    "Если явного дедлайна нет, но страница выглядит как старая новость или архивный анонс, выбирай ended или uncertain.",
    "Если ends_at_state = future, не выбирай ended без очень сильного явного признака завершения на странице.",
    'Верни только JSON без пояснений и markdown.',
    'Формат JSON: {"status":"active|ended|uncertain","confidence":0.0,"reason":"...","suggested_title":"...|null","suggested_body":"...|null"}',
    "",
    `Заголовок: ${input.title}`,
    `Клиника: ${input.clinicName ?? "не указана"}`,
    `Источник: ${input.sourceName ?? "не указан"}`,
    `URL: ${input.sourceUrl}`,
    `Срок из данных: ${input.endsAt ?? "не указан"}`,
    `Состояние срока: ${endsAtState}`,
    "",
    "Текст страницы/фрагмент:",
    pageText,
  ].join("\n");
}

export class PromotionAiService {
  isAvailable(env: WorkerBindings) {
    return Boolean(env.AI || env.GROQ_API_KEY?.trim());
  }

  private isGroqAvailable(env: WorkerBindings) {
    return Boolean(env.GROQ_API_KEY?.trim());
  }

  private async loadPageText(sourceUrl: string) {
    const response = await fetch(sourceUrl, {
      redirect: "follow",
      headers: {
        "User-Agent": "MedsearchRB-Worker/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to load promotion page: HTTP ${response.status}`);
    }

    return (await response.text()).slice(0, 12_000);
  }

  async auditPromotion(
    env: WorkerBindings,
    input: PromotionAiAuditInput,
    provider: PromotionAiProviderPreference = "auto",
  ): Promise<PromotionAiAuditResult> {
    if (provider === "cloudflare") {
      return this.auditWithCloudflare(env, input);
    }

    if (provider === "groq") {
      return this.auditWithGroq(env, input);
    }

    const cloudflareResult = await this.auditWithCloudflare(env, input);
    if (!this.shouldFallbackToGroq(cloudflareResult) || !this.isGroqAvailable(env)) {
      return cloudflareResult;
    }

    const groqResult = await this.auditWithGroq(env, input);
    if (groqResult.confidence > cloudflareResult.confidence) {
      return groqResult;
    }

    return cloudflareResult;
  }

  private async auditWithCloudflare(
    env: WorkerBindings,
    input: PromotionAiAuditInput,
  ): Promise<PromotionAiAuditResult> {
    if (!env.AI) {
      return {
        available: false,
        model: null,
        provider: null,
        status: "uncertain",
        confidence: 0,
        reason: "Workers AI binding is not configured",
        suggested_title: null,
        suggested_body: null,
      };
    }

    const model = env.AI_PROMO_MODEL?.trim() || DEFAULT_PROMOTION_AI_MODEL;
    let pageText = input.pageText?.trim()
      ? input.pageText.slice(0, 12_000)
      : "";

    if (!pageText) {
      try {
        pageText = await this.loadPageText(input.sourceUrl);
      } catch (error) {
        pageText =
          `Не удалось загрузить страницу источника автоматически. ` +
          `Источник: ${input.sourceUrl}. ` +
          `Ошибка: ${error instanceof Error ? error.message : "unknown fetch error"}`;
      }
    }
    try {
      const prompt = buildPromotionAuditPrompt(input, pageText);
      const response = await env.AI.run(model as keyof AiModels, { prompt });
      const text = extractAiText(response);
      const parsed = aiPromotionAuditSchema.parse(JSON.parse(extractJsonBlock(text)));

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
        status: "uncertain",
        confidence: 0,
        reason: error instanceof Error ? error.message : "Workers AI audit failed",
        suggested_title: null,
        suggested_body: null,
      };
    }
  }

  private shouldFallbackToGroq(result: PromotionAiAuditResult) {
    return !result.available || result.status === "uncertain" || result.confidence < 0.8;
  }

  private async runGroqAuditWithModel(
    apiKey: string,
    model: string,
    prompt: string,
  ) {
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
            content: prompt,
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

    return aiPromotionAuditSchema.parse(JSON.parse(extractJsonBlock(text)));
  }

  private async auditWithGroq(
    env: WorkerBindings,
    input: PromotionAiAuditInput,
  ): Promise<PromotionAiAuditResult> {
    const apiKey = env.GROQ_API_KEY?.trim();
    if (!apiKey) {
      return {
        available: false,
        model: null,
        provider: null,
        status: "uncertain",
        confidence: 0,
        reason: "Groq API key is not configured",
        suggested_title: null,
        suggested_body: null,
      };
    }

    let pageText = input.pageText?.trim()
      ? input.pageText.slice(0, 12_000)
      : "";

    if (!pageText) {
      try {
        pageText = await this.loadPageText(input.sourceUrl);
      } catch (error) {
        pageText =
          `Не удалось загрузить страницу источника автоматически. ` +
          `Источник: ${input.sourceUrl}. ` +
          `Ошибка: ${error instanceof Error ? error.message : "unknown fetch error"}`;
      }
    }

    const prompt = buildPromotionAuditPrompt(input, pageText);
    const primaryModel = env.GROQ_PROMO_MODEL?.trim() || DEFAULT_GROQ_PROMO_MODEL;
    const fallbackModel =
      env.GROQ_PROMO_FALLBACK_MODEL?.trim() || DEFAULT_GROQ_PROMO_FALLBACK_MODEL;

    try {
      const parsed = await this.runGroqAuditWithModel(apiKey, primaryModel, prompt);
      return {
        available: true,
        provider: "groq",
        model: primaryModel,
        ...parsed,
      };
    } catch (primaryError) {
      try {
        const parsed = await this.runGroqAuditWithModel(apiKey, fallbackModel, prompt);
        return {
          available: true,
          provider: "groq",
          model: fallbackModel,
          ...parsed,
        };
      } catch (fallbackError) {
        const reason =
          fallbackError instanceof Error
            ? fallbackError.message
            : primaryError instanceof Error
              ? primaryError.message
              : "Groq audit failed";

        return {
          available: true,
          provider: "groq",
          model: fallbackModel,
          status: "uncertain",
          confidence: 0,
          reason,
          suggested_title: null,
          suggested_body: null,
        };
      }
    }
  }
}
