"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  DEFAULT_DESIGN_LANGUAGE,
  DESIGN_LANGUAGE_STORAGE_KEY,
  DesignLanguage,
  isDesignLanguage,
  normalizeDesignLanguage,
} from "@/lib/design-language";

const DESIGN_LANGUAGE_ATTRIBUTE = "data-design-language";

interface DesignLanguageContextType {
  designLanguage: DesignLanguage;
  setDesignLanguage: (designLanguage: DesignLanguage) => void;
}

const DesignLanguageContext =
  createContext<DesignLanguageContextType | undefined>(undefined);
const designLanguageListeners = new Set<() => void>();

function getStoredDesignLanguage(): DesignLanguage {
  const storedDesignLanguage = readStoredDesignLanguage();
  if (storedDesignLanguage) {
    return storedDesignLanguage;
  }

  return DEFAULT_DESIGN_LANGUAGE;
}

function readStoredDesignLanguage(): DesignLanguage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(DESIGN_LANGUAGE_STORAGE_KEY);
    if (isDesignLanguage(stored)) {
      return stored;
    }

    return null;
  } catch {
    return null;
  }
}

function setHtmlDesignLanguage(designLanguage: DesignLanguage) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.setAttribute(DESIGN_LANGUAGE_ATTRIBUTE, designLanguage);
}

function subscribeToDesignLanguage(callback: () => void) {
  designLanguageListeners.add(callback);
  return () => {
    designLanguageListeners.delete(callback);
  };
}

function emitDesignLanguageChange() {
  designLanguageListeners.forEach((listener) => listener());
}

function getDesignLanguageSnapshot(): DesignLanguage {
  const storedDesignLanguage = readStoredDesignLanguage();
  if (storedDesignLanguage) {
    return storedDesignLanguage;
  }

  if (typeof document !== "undefined") {
    const attributeValue = document.documentElement.getAttribute(
      DESIGN_LANGUAGE_ATTRIBUTE
    );
    if (attributeValue) {
      return normalizeDesignLanguage(attributeValue);
    }
  }

  return getStoredDesignLanguage();
}

function getDesignLanguageServerSnapshot(): DesignLanguage {
  return DEFAULT_DESIGN_LANGUAGE;
}

export function DesignLanguageProvider({ children }: { children: ReactNode }) {
  const designLanguage = useSyncExternalStore(
    subscribeToDesignLanguage,
    getDesignLanguageSnapshot,
    getDesignLanguageServerSnapshot
  );

  const setDesignLanguage = useCallback((nextDesignLanguage: DesignLanguage) => {
    try {
      window.localStorage.setItem(DESIGN_LANGUAGE_STORAGE_KEY, nextDesignLanguage);
    } catch {
      // Ignore write failures (private browsing / quota)
    }

    setHtmlDesignLanguage(nextDesignLanguage);
    emitDesignLanguageChange();
  }, []);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key !== DESIGN_LANGUAGE_STORAGE_KEY) {
        return;
      }

      const nextDesignLanguage = normalizeDesignLanguage(event.newValue);
      setHtmlDesignLanguage(nextDesignLanguage);
      emitDesignLanguageChange();
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  useEffect(() => {
    setHtmlDesignLanguage(designLanguage);
  }, [designLanguage]);

  const value = useMemo(
    () => ({ designLanguage, setDesignLanguage }),
    [designLanguage, setDesignLanguage]
  );

  return (
    <DesignLanguageContext.Provider value={value}>
      {children}
    </DesignLanguageContext.Provider>
  );
}

export function useDesignLanguage() {
  const context = useContext(DesignLanguageContext);

  if (!context) {
    throw new Error("useDesignLanguage must be used within a DesignLanguageProvider");
  }

  return context;
}
