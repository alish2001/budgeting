"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyboardShortcut } from "./keyboard-shortcut";

interface SetTargetFormProps {
  categoryName: string;
  initialValue: number;
  onSubmit: (value: number) => void;
  onCancel: () => void;
}

export function SetTargetForm({ categoryName, initialValue, onSubmit, onCancel }: SetTargetFormProps) {
  const [value, setValue] = useState(initialValue.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const parsed = Math.max(0, Math.min(100, Number(value) || 0));
    onSubmit(parsed);
  };

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.12 }} className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Button type="button" variant="ghost" size="icon-sm" onClick={onCancel} className="rounded-md" aria-label="Go back">
          <ArrowLeft className="size-4" />
        </Button>
        <h3 className="font-semibold">Set target — {categoryName}</h3>
        <KeyboardShortcut shortcut="ESC" />
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="cmd-target" className="text-xs text-muted-foreground">Target (% of income)</Label>
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              id="cmd-target"
              type="number"
              min={0}
              max={100}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); onCancel(); } }}
              className="h-9 w-28"
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
        </div>
        <div className="flex items-center justify-end pt-2">
          <Button type="submit" className="h-9 px-4 gap-2">
            <Check className="size-4" />
            Save
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
