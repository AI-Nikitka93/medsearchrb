import type { WorkerBindings } from "../env";
import { requireBinding } from "../env";

type TelegramApiResponse<T> = {
  ok: boolean;
  result?: T;
  description?: string;
};

type TelegramInlineKeyboard = {
  inline_keyboard: Array<Array<Record<string, unknown>>>;
};

type TelegramMessageUpdate = {
  message?: {
    chat?: {
      id?: number;
    };
    text?: string;
  };
  callback_query?: {
    id: string;
    data?: string;
    message?: {
      chat?: {
        id?: number;
      };
    };
  };
};

type SendMessageParams = {
  chat_id: number | string;
  text: string;
  reply_markup?: TelegramInlineKeyboard;
  disable_web_page_preview?: boolean;
};

function normalizeChannelUsername(rawValue?: string) {
  const value = (rawValue ?? "").trim();
  if (!value) {
    return null;
  }

  if (value.startsWith("@")) {
    return value;
  }

  if (value.startsWith("https://t.me/")) {
    return `@${value.slice("https://t.me/".length)}`;
  }

  if (value.startsWith("http://t.me/")) {
    return `@${value.slice("http://t.me/".length)}`;
  }

  if (value.startsWith("t.me/")) {
    return `@${value.slice("t.me/".length)}`;
  }

  return `@${value}`;
}

function buildChannelLine(env: WorkerBindings) {
  const username = normalizeChannelUsername(env.TELEGRAM_CHANNEL_USERNAME);
  if (!username) {
    return "";
  }

  return `\nТакже можно подписаться на канал с обновлениями и акциями: ${username}`;
}

function buildMainKeyboard(env: WorkerBindings): TelegramInlineKeyboard {
  const channelUsername = normalizeChannelUsername(env.TELEGRAM_CHANNEL_USERNAME);
  const rows: TelegramInlineKeyboard["inline_keyboard"] = [
    [
      {
        text: "🔍 Найти врача",
        web_app: {
          url: requireBinding(env, "WEBAPP_URL"),
        },
      },
    ],
    [
      {
        text: "ℹ️ О сервисе",
        callback_data: "bot:about",
      },
      {
        text: "🔐 Privacy",
        callback_data: "bot:privacy",
      },
    ],
  ];

  if (channelUsername) {
    rows.push([
      {
        text: "📣 Канал с обновлениями",
        url: `https://t.me/${channelUsername.slice(1)}`,
      },
    ]);
  }

  return { inline_keyboard: rows };
}

function buildAboutKeyboard(env: WorkerBindings): TelegramInlineKeyboard {
  const channelUsername = normalizeChannelUsername(env.TELEGRAM_CHANNEL_USERNAME);
  const rows: TelegramInlineKeyboard["inline_keyboard"] = [
    [
      {
        text: "🔍 Открыть Mini App",
        web_app: {
          url: requireBinding(env, "WEBAPP_URL"),
        },
      },
    ],
  ];

  if (channelUsername) {
    rows.push([
      {
        text: "📣 Канал с обновлениями",
        url: `https://t.me/${channelUsername.slice(1)}`,
      },
    ]);
  }

  return { inline_keyboard: rows };
}

function buildPrivacyKeyboard(env: WorkerBindings): TelegramInlineKeyboard {
  const channelUsername = normalizeChannelUsername(env.TELEGRAM_CHANNEL_USERNAME);
  const rows: TelegramInlineKeyboard["inline_keyboard"] = [
    [
      {
        text: "🔐 Открыть политику",
        url: requireBinding(env, "PRIVACY_URL"),
      },
    ],
    [
      {
        text: "🔍 Перейти в Mini App",
        web_app: {
          url: requireBinding(env, "WEBAPP_URL"),
        },
      },
    ],
  ];

  if (channelUsername) {
    rows.push([
      {
        text: "📣 Канал с обновлениями",
        url: `https://t.me/${channelUsername.slice(1)}`,
      },
    ]);
  }

  return { inline_keyboard: rows };
}

function buildStartText(env: WorkerBindings) {
  return (
    "Привет! Я помогаю быстро сориентироваться по врачам Минска.\n\n" +
    "Здесь можно:\n" +
    "• найти врача по нужной специальности;\n" +
    "• сравнить отзывы и сигналы доверия;\n" +
    "• увидеть актуальные акции частных клиник.\n\n" +
    "Нажмите кнопку ниже, чтобы открыть Mini App и начать поиск." +
    buildChannelLine(env)
  );
}

function buildHelpText(env: WorkerBindings) {
  return (
    "Команды бота:\n" +
    "/start — открыть главное меню и кнопку поиска\n" +
    "/help — подсказка по использованию\n" +
    "/about — что умеет сервис\n" +
    "/privacy — политика конфиденциальности\n\n" +
    `Если заметите неточность, напишите в поддержку: ${env.SUPPORT_USERNAME?.trim() || "@AI_Nikitka93"}` +
    buildChannelLine(env)
  );
}

function buildAboutText(env: WorkerBindings) {
  return (
    "Это Telegram-бот агрегатора врачей Минска.\n\n" +
    "Мы не оказываем медицинские услуги и не записываем к врачу внутри бота. " +
    "Бот помогает понять, куда идти: показывает врачей, клиники, отзывы и акции, " +
    "а затем ведёт в Mini App для поиска и перехода к оригинальной записи.\n\n" +
    (env.BOT_DESCRIPTION?.trim() ||
      "Поиск врачей Минска, отзывы и актуальные акции. Создано @AI_Nikitka93.") +
    buildChannelLine(env)
  );
}

function buildPrivacyText(env: WorkerBindings) {
  return (
    "Политика конфиденциальности доступна по ссылке ниже.\n" +
    `Текущая ссылка для Mini App: ${requireBinding(env, "PRIVACY_URL")}`
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export class TelegramBotService {
  constructor(private readonly env: WorkerBindings) {}

  webhookSecret() {
    return this.env.TELEGRAM_WEBHOOK_SECRET?.trim() || this.env.INGEST_SHARED_SECRET;
  }

  channelTarget() {
    const channelId = this.env.TELEGRAM_CHANNEL_ID?.trim();
    if (channelId) {
      return channelId;
    }

    return normalizeChannelUsername(this.env.TELEGRAM_CHANNEL_USERNAME);
  }

  async handleUpdate(update: TelegramMessageUpdate) {
    if (update.callback_query) {
      await this.handleCallback(update.callback_query);
      return;
    }

    if (update.message?.chat?.id && update.message.text) {
      await this.handleMessage(update.message.chat.id, update.message.text);
    }
  }

  private async handleMessage(chatId: number, text: string) {
    const command = text.trim().split(/\s+/)[0]?.toLowerCase() ?? "";

    if (command === "/start") {
      await this.sendMessage({
        chat_id: chatId,
        text: buildStartText(this.env),
        reply_markup: buildMainKeyboard(this.env),
      });
      return;
    }

    if (command === "/help") {
      await this.sendMessage({
        chat_id: chatId,
        text: buildHelpText(this.env),
      });
      return;
    }

    if (command === "/about") {
      await this.sendMessage({
        chat_id: chatId,
        text: buildAboutText(this.env),
        reply_markup: buildAboutKeyboard(this.env),
      });
      return;
    }

    if (command === "/privacy") {
      await this.sendMessage({
        chat_id: chatId,
        text: buildPrivacyText(this.env),
        reply_markup: buildPrivacyKeyboard(this.env),
      });
      return;
    }

    await this.sendMessage({
      chat_id: chatId,
      text:
        "Я работаю как быстрый вход в Mini App.\n\n" +
        "Используйте /start, чтобы открыть главное меню и перейти к поиску врача.",
      reply_markup: buildMainKeyboard(this.env),
    });
  }

  private async handleCallback(callbackQuery: NonNullable<TelegramMessageUpdate["callback_query"]>) {
    const chatId = callbackQuery.message?.chat?.id;
    const data = callbackQuery.data ?? "";

    if (chatId && data === "bot:about") {
      await this.sendMessage({
        chat_id: chatId,
        text: buildAboutText(this.env),
        reply_markup: buildAboutKeyboard(this.env),
      });
    } else if (chatId && data === "bot:privacy") {
      await this.sendMessage({
        chat_id: chatId,
        text: buildPrivacyText(this.env),
        reply_markup: buildPrivacyKeyboard(this.env),
      });
    }

    await this.callTelegram("answerCallbackQuery", {
      callback_query_id: callbackQuery.id,
    });
  }

  private async sendMessage(payload: SendMessageParams) {
    await this.callTelegram("sendMessage", {
      ...payload,
      parse_mode: "HTML",
      disable_web_page_preview: payload.disable_web_page_preview ?? false,
    });
  }

  async sendPromotionToChannel(args: {
    title: string;
    clinicName: string;
    sourceName: string;
    sourceUrl: string;
    clinicSiteUrl: string | null;
    endsAt: string | null;
  }) {
    const chatId = this.channelTarget();
    if (!chatId) {
      throw new Error("Missing TELEGRAM_CHANNEL_ID or TELEGRAM_CHANNEL_USERNAME");
    }

    const deadline = args.endsAt
      ? new Intl.DateTimeFormat("ru-BY", {
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "Europe/Minsk",
        }).format(new Date(args.endsAt))
      : null;

    const lines = [
      "🔥 <b>Новая акция медцентра в Минске</b>",
      "",
      `<b>${escapeHtml(args.title)}</b>`,
      `Клиника: ${escapeHtml(args.clinicName)}`,
      `Источник: ${escapeHtml(args.sourceName)}`,
    ];

    if (deadline) {
      lines.push(`Действует до: ${escapeHtml(deadline)}`);
    }

    lines.push(
      "",
      "Проверьте условия акции перед записью и переходите по ссылкам ниже.",
      "",
      "Создано @AI_Nikitka93",
    );

    const buttons: TelegramInlineKeyboard["inline_keyboard"] = [
      [
        {
          text: "Открыть акцию",
          url: args.sourceUrl,
        },
      ],
    ];

    if (args.clinicSiteUrl && args.clinicSiteUrl !== args.sourceUrl) {
      buttons.push([
        {
          text: "Сайт клиники",
          url: args.clinicSiteUrl,
        },
      ]);
    }

    if (this.env.WEBAPP_URL?.trim()) {
      buttons.push([
        {
          text: "Открыть каталог врачей",
          url: this.env.WEBAPP_URL.trim(),
        },
      ]);
    }

    await this.sendMessage({
      chat_id: chatId,
      text: lines.join("\n"),
      reply_markup: { inline_keyboard: buttons },
      disable_web_page_preview: true,
    });
  }

  private async callTelegram<T>(method: string, payload: Record<string, unknown>) {
    const token = requireBinding(this.env, "BOT_TOKEN");
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as TelegramApiResponse<T>;
    if (!response.ok || !data.ok) {
      throw new Error(data.description || `Telegram API ${method} failed with ${response.status}`);
    }

    return data.result as T;
  }
}
