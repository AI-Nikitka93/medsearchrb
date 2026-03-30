export {};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

type ThemeParams = Partial<{
  bg_color: string;
  text_color: string;
  hint_color: string;
  link_color: string;
  button_color: string;
  button_text_color: string;
  secondary_bg_color: string;
  header_bg_color: string;
  bottom_bar_bg_color: string;
  accent_text_color: string;
  section_bg_color: string;
  section_header_text_color: string;
  section_separator_color: string;
  subtitle_text_color: string;
  destructive_text_color: string;
}>;

type TelegramWebAppUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
};

type TelegramWebAppInitData = {
  query_id?: string;
  user?: TelegramWebAppUser;
  chat_type?: string;
  chat_instance?: string;
  start_param?: string;
  auth_date?: number;
  hash?: string;
};

interface TelegramWebAppBackButton {
  isVisible?: boolean;
  show: () => void;
  hide: () => void;
  onClick?: (handler: () => void) => void;
  offClick?: (handler: () => void) => void;
}

interface TelegramWebAppHapticFeedback {
  impactOccurred?: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
  notificationOccurred?: (type: "error" | "success" | "warning") => void;
  selectionChanged?: () => void;
}

interface TelegramWebApp {
  initData?: string;
  initDataUnsafe?: TelegramWebAppInitData;
  themeParams?: ThemeParams;
  colorScheme?: "light" | "dark";
  isExpanded?: boolean;
  viewportHeight?: number;
  viewportStableHeight?: number;
  safeAreaInset?: Partial<Record<"top" | "right" | "bottom" | "left", number>>;
  contentSafeAreaInset?: Partial<Record<"top" | "right" | "bottom" | "left", number>>;
  BackButton?: TelegramWebAppBackButton;
  HapticFeedback?: TelegramWebAppHapticFeedback;
  ready: () => void;
  expand: () => void;
  enableClosingConfirmation?: () => void;
  disableClosingConfirmation?: () => void;
  openLink?: (href: string) => void;
  openTelegramLink?: (href: string) => void;
  onEvent?: (eventType: string, handler: () => void) => void;
  offEvent?: (eventType: string, handler: () => void) => void;
}
