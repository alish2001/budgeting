// Keyboard shortcut display helper
export function KeyboardShortcut({ shortcut }: { shortcut: string }) {
  return (
    <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
      {shortcut}
    </kbd>
  );
}
