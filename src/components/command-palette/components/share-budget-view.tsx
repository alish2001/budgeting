"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, ArrowLeft, Link, Code, Copy, Check } from "lucide-react";
import { useBudget } from "@/lib/budget-context";
import { encodeBudget, generateShareUrl } from "@/lib/budget-serialization";
import { KeyboardShortcut } from "./keyboard-shortcut";

interface ShareBudgetViewProps {
  onCancel: () => void;
}

export function ShareBudgetView({ onCancel }: ShareBudgetViewProps) {
  const { state, isHydrated, getTotalIncome } = useBudget();
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const totalIncome = getTotalIncome();
  const hasData = totalIncome > 0 || 
                  state.categories.needs.items.length > 0 || 
                  state.categories.wants.items.length > 0 || 
                  state.categories.savings.items.length > 0;

  const shareUrl = isHydrated && hasData ? generateShareUrl(state) : "";
  const shareCode = isHydrated && hasData ? encodeBudget(state) : "";

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (error) {
      console.error("Failed to copy URL:", error);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(shareCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (error) {
      console.error("Failed to copy code:", error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.12 }}
      className="p-4"
    >
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={onCancel}
          className="p-1 hover:bg-muted rounded-md transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="size-4" />
        </button>
        <h3 className="font-semibold flex items-center gap-2">
          <Share2 className="size-4" />
          Share Budget
        </h3>
        <KeyboardShortcut shortcut="ESC" />
      </div>

      <div className="space-y-4">
        {/* Share URL */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
            <Link className="size-3.5" />
            Shareable Link
          </label>
          <div className="flex gap-2">
            <input
              readOnly
              value={shareUrl}
              className="flex-1 h-9 px-3 text-xs font-mono rounded-md border border-input bg-muted/50 cursor-default"
              onClick={(e) => e.currentTarget.select()}
            />
            <button
              onClick={handleCopyUrl}
              className="h-9 w-9 flex items-center justify-center border border-input rounded-md hover:bg-muted transition-colors shrink-0"
              aria-label={copiedUrl ? "URL copied" : "Copy URL"}
            >
              <AnimatePresence mode="wait">
                {copiedUrl ? (
                  <motion.div
                    key="check"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Check className="size-4 text-green-600" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="copy"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Copy className="size-4" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>

        {/* Share Code */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
            <Code className="size-3.5" />
            Budget Code
          </label>
          <div className="flex gap-2">
            <input
              readOnly
              value={shareCode}
              className="flex-1 h-9 px-3 text-xs font-mono rounded-md border border-input bg-muted/50 cursor-default"
              onClick={(e) => e.currentTarget.select()}
            />
            <button
              onClick={handleCopyCode}
              className="h-9 w-9 flex items-center justify-center border border-input rounded-md hover:bg-muted transition-colors shrink-0"
              aria-label={copiedCode ? "Code copied" : "Copy code"}
            >
              <AnimatePresence mode="wait">
                {copiedCode ? (
                  <motion.div
                    key="check"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Check className="size-4 text-green-600" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="copy"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Copy className="size-4" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
