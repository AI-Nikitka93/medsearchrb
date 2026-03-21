"use client";

import { useEffect } from "react";

const TELEGRAM_THEME_MAP = {
  bg_color: "--tg-theme-bg-color",
  text_color: "--tg-theme-text-color",
  hint_color: "--tg-theme-hint-color",
  link_color: "--tg-theme-link-color",
  button_color: "--tg-theme-button-color",
  button_text_color: "--tg-theme-button-text-color",
  secondary_bg_color: "--tg-theme-secondary-bg-color",
  header_bg_color: "--tg-theme-header-bg-color",
  bottom_bar_bg_color: "--tg-theme-bottom-bar-bg-color",
  accent_text_color: "--tg-theme-accent-text-color",
  section_bg_color: "--tg-theme-section-bg-color",
  section_header_text_color: "--tg-theme-section-header-text-color",
  section_separator_color: "--tg-theme-section-separator-color",
  subtitle_text_color: "--tg-theme-subtitle-text-color",
  destructive_text_color: "--tg-theme-destructive-text-color",
} as const;

function applyThemeParams() {
  try {
    const webApp = window.Telegram?.WebApp;
    const params = webApp?.themeParams;

    if (!params) {
      return;
    }

    for (const key of Object.keys(
      TELEGRAM_THEME_MAP,
    ) as Array<keyof typeof TELEGRAM_THEME_MAP>) {
      const cssVar = TELEGRAM_THEME_MAP[key];
      const value = params[key];

      if (value) {
        document.documentElement.style.setProperty(cssVar, value);
      }
    }

    if (webApp.colorScheme) {
      document.documentElement.dataset.tgScheme = webApp.colorScheme;
    }
  } catch (error) {
    console.warn("Telegram theme sync failed", error);
  }
}

export function TelegramInit() {
  useEffect(() => {
    try {
      const webApp = window.Telegram?.WebApp;
      const syncTheme = () => applyThemeParams();

      applyThemeParams();
      webApp?.ready();
      webApp?.expand();
      webApp?.onEvent?.("themeChanged", syncTheme);

      return () => {
        try {
          webApp?.offEvent?.("themeChanged", syncTheme);
        } catch (error) {
          console.warn("Telegram theme unsubscribe failed", error);
        }
      };
    } catch (error) {
      console.warn("Telegram WebApp init failed", error);
      return undefined;
    }
  }, []);

  return null;
}
