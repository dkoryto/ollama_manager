"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

export type GenOptions = {
  temperature: number;
  top_p: number;
  top_k: number;
  num_ctx: number;
  seed: number;
  system?: string;
};

const defaultOptions: GenOptions = {
  temperature: 0.7,
  top_p: 0.9,
  top_k: 40,
  num_ctx: 2048,
  seed: 0,
  system: "",
};

type SettingsContextType = {
  options: GenOptions;
  setOptions: (opts: Partial<GenOptions>) => void;
  resetOptions: () => void;
};

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [options, setOptionsState] = useState<GenOptions>(() => {
    if (typeof window === "undefined") return defaultOptions;
    try {
      const raw = localStorage.getItem("ollama-settings");
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...defaultOptions, ...parsed };
      }
    } catch {
      /* empty */
    }
    return defaultOptions;
  });

  useEffect(() => {
    localStorage.setItem("ollama-settings", JSON.stringify(options));
  }, [options]);

  const setOptions = (opts: Partial<GenOptions>) => {
    setOptionsState((prev) => ({ ...prev, ...opts }));
  };

  const resetOptions = () => setOptionsState(defaultOptions);

  return (
    <SettingsContext.Provider value={{ options, setOptions, resetOptions }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
