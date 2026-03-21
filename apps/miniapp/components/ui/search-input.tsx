"use client";

import type { ChangeEvent, FormEvent } from "react";
import { PrimaryButton } from "@/components/ui/button";

type SearchInputProps = {
  value: string;
  onChange: (nextValue: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  inputId?: string;
};

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="size-5 stroke-current"
      fill="none"
      strokeWidth="1.8"
    >
      <circle cx="9" cy="9" r="5.25" />
      <path d="M13.5 13.5 17 17" />
    </svg>
  );
}

function SubmitIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="size-4 stroke-current"
      fill="none"
      strokeWidth="1.8"
    >
      <path d="M4.75 10h9.5" />
      <path d="m10.75 4.75 4.5 5.25-4.5 5.25" />
    </svg>
  );
}

export function SearchInput({
  value,
  onChange,
  onSubmit,
  placeholder = "Врач, специальность или клиника",
  inputId = "catalog-search",
}: SearchInputProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit?.();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 rounded-lg bg-surface p-2 shadow-soft"
      role="search"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 px-2 text-hint">
        <SearchIcon />
        <input
          id={inputId}
          aria-label="Поиск врача, специальности или клиники"
          className="w-full min-w-0 bg-transparent text-sm text-text outline-none placeholder:text-hint"
          value={value}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            onChange(event.target.value)
          }
          placeholder={placeholder}
        />
      </div>
      <PrimaryButton
        aria-label="Запустить поиск"
        className="size-11 shrink-0 px-0"
        type="submit"
        style="primary"
      >
        <SubmitIcon />
      </PrimaryButton>
    </form>
  );
}
