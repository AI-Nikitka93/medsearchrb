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

function applyViewportMetrics() {
  try {
    const webApp = window.Telegram?.WebApp;
    if (!webApp) {
      return;
    }

    if (typeof webApp.viewportHeight === "number") {
      document.documentElement.style.setProperty(
        "--tg-viewport-height",
        `${webApp.viewportHeight}px`,
      );
    }

    if (typeof webApp.viewportStableHeight === "number") {
      document.documentElement.style.setProperty(
        "--tg-viewport-stable-height",
        `${webApp.viewportStableHeight}px`,
      );
    }

    for (const side of ["top", "right", "bottom", "left"] as const) {
      const safeAreaValue = webApp.safeAreaInset?.[side];
      const contentSafeAreaValue = webApp.contentSafeAreaInset?.[side];

      if (typeof safeAreaValue === "number") {
        document.documentElement.style.setProperty(
          `--tg-safe-area-inset-${side}`,
          `${safeAreaValue}px`,
        );
      }

      if (typeof contentSafeAreaValue === "number") {
        document.documentElement.style.setProperty(
          `--tg-content-safe-area-inset-${side}`,
          `${contentSafeAreaValue}px`,
        );
      }
    }
  } catch (error) {
    console.warn("Telegram viewport sync failed", error);
  }
}

export function TelegramInit() {
  useEffect(() => {
    try {
      const webApp = window.Telegram?.WebApp;
      const syncTheme = () => applyThemeParams();
      const syncViewport = () => applyViewportMetrics();

      applyThemeParams();
      applyViewportMetrics();
      webApp?.ready();
      webApp?.expand();
      webApp?.onEvent?.("themeChanged", syncTheme);
      webApp?.onEvent?.("viewportChanged", syncViewport);
      webApp?.onEvent?.("safeAreaChanged", syncViewport);
      webApp?.onEvent?.("contentSafeAreaChanged", syncViewport);

      return () => {
        try {
          webApp?.offEvent?.("themeChanged", syncTheme);
          webApp?.offEvent?.("viewportChanged", syncViewport);
          webApp?.offEvent?.("safeAreaChanged", syncViewport);
          webApp?.offEvent?.("contentSafeAreaChanged", syncViewport);
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
