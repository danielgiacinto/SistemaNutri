/** Separador horizontal con un texto centrado (por ejemplo, "o con tu correo"). */
export function SeparadorTexto({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground" role="separator" aria-label={String(children)}>
      <span className="h-px flex-1 bg-border" aria-hidden="true" />
      <span aria-hidden="true">{children}</span>
      <span className="h-px flex-1 bg-border" aria-hidden="true" />
    </div>
  );
}
