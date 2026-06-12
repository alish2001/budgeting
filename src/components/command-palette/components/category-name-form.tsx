"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyboardShortcut } from "./keyboard-shortcut";

interface CategoryNameFormProps {
  mode: "add" | "rename";
  /** Overrides the default heading (e.g. "Add Subcategory to Needs › Housing"). */
  title?: string;
  initialName?: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}

export function CategoryNameForm({ mode, title, initialName = "", onSubmit, onCancel }: CategoryNameFormProps) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!name.trim()) {
      setError("Please enter a category name");
      return;
    }
    onSubmit(name.trim());
  };

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.12 }} className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Button type="button" variant="ghost" size="icon-sm" onClick={onCancel} className="rounded-md" aria-label="Go back">
          <ArrowLeft className="size-4" />
        </Button>
        <h3 className="font-semibold flex items-center gap-2 min-w-0">
          <Tag className="size-4 shrink-0" />
          <span className="truncate">
            {title ?? (mode === "add" ? "Add Category" : "Rename Category")}
          </span>
        </h3>
        <KeyboardShortcut shortcut="ESC" />
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="cmd-category-name" className="text-xs text-muted-foreground">Category name</Label>
          <Input
            ref={inputRef}
            id="cmd-category-name"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(null); }}
            onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); onCancel(); } }}
            placeholder="e.g., Health, Debt, Travel…"
            className="h-9"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex items-center justify-end pt-2">
          <Button type="submit" className="h-9 px-4 gap-2">
            <Check className="size-4" />
            {mode === "add" ? "Add Category" : "Save"}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
