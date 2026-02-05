"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, ArrowLeft, Link, Code, Copy, Check } from "lucide-react";
import { useBudget } from "@/lib/budget-context";
import { encodeBudget, generateShareUrl } from "@/lib/budget-serialization";
import { KeyboardShortcut } from "./keyboard-shortcut";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onCancel}
          className="rounded-md"
          aria-label="Go back"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <h3 className="font-semibold flex items-center gap-2">
          <Share2 className="size-4" />
          Share Budget
        </h3>
        <KeyboardShortcut shortcut="ESC" />
      </div>

      <div className="space-y-4">
        {/* Share URL */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground flex items-center gap-2">
            <Link className="size-3.5" />
            Shareable Link
          </Label>
          <div className="flex gap-2">
            <Input
              readOnly
              value={shareUrl}
              className="h-9 text-xs font-mono bg-muted/50 cursor-default"
              onClick={(e) => e.currentTarget.select()}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleCopyUrl}
              className="h-9 w-9 shrink-0"
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
            </Button>
          </div>
        </div>

        {/* Share Code */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground flex items-center gap-2">
            <Code className="size-3.5" />
            Budget Code
          </Label>
          <div className="flex gap-2">
            <Input
              readOnly
              value={shareCode}
              className="h-9 text-xs font-mono bg-muted/50 cursor-default"
              onClick={(e) => e.currentTarget.select()}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleCopyCode}
              className="h-9 w-9 shrink-0"
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
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
