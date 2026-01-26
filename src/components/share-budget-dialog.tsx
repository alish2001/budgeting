"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBudget } from "@/lib/budget-context";
import { encodeBudget, generateShareUrl } from "@/lib/budget-serialization";
import { Share2, Copy, Check, Link, Code } from "lucide-react";

export function ShareBudgetDialog() {
  const { state, getTotalIncome, isHydrated } = useBudget();
  const [isOpen, setIsOpen] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Calculate share URL and code during render (only when dialog is open)
  const shareUrl = useMemo(
    () => (isOpen && isHydrated ? generateShareUrl(state) : ""),
    [isOpen, isHydrated, state]
  );
  const shareCode = useMemo(
    () => (isOpen && isHydrated ? encodeBudget(state) : ""),
    [isOpen, isHydrated, state]
  );

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

  const totalIncome = getTotalIncome();
  const hasData = totalIncome > 0 || state.categories.needs.items.length > 0 || 
                  state.categories.wants.items.length > 0 || 
                  state.categories.savings.items.length > 0;

  if (!isHydrated) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={!hasData}
          title={hasData ? "Share your budget" : "Add some budget items first"}
        >
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Your Budget
          </DialogTitle>
          <DialogDescription>
            Share this budget with others or save it for yourself. Anyone with
            the link or code can view and import this budget configuration.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Share URL */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Link className="h-4 w-4" />
              Shareable Link
            </Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={shareUrl}
                className="font-mono text-xs bg-muted/50 cursor-default"
                onClick={(e) => e.currentTarget.select()}
                aria-label="Shareable URL"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyUrl}
                className="shrink-0"
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
                      <Check className="h-4 w-4 text-green-600" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="copy"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Copy className="h-4 w-4" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Send this link to anyone - they can open it directly to import
              your budget.
            </p>
          </div>

          {/* Share Code */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Code className="h-4 w-4" />
              Budget Code
            </Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={shareCode}
                className="font-mono text-xs bg-muted/50 cursor-default"
                onClick={(e) => e.currentTarget.select()}
                aria-label="Budget code"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyCode}
                className="shrink-0"
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
                      <Check className="h-4 w-4 text-green-600" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="copy"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Copy className="h-4 w-4" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Or share this code - paste it into the Import dialog to restore
              the budget.
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
