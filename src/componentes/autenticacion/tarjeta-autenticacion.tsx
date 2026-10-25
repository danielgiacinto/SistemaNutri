type PropiedadesTarjeta = {
  titulo: string;
  descripcion?: React.ReactNode;
  pie?: React.ReactNode;
  children: React.ReactNode;
};

export function TarjetaAutenticacion({ titulo, descripcion, pie, children }: PropiedadesTarjeta) {
  return (
    <div className="w-full max-w-md space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{titulo}</h1>
        {descripcion && <p className="text-sm text-muted-foreground sm:text-base">{descripcion}</p>}
      </div>
      <div className="space-y-6">{children}</div>
      {pie && <div className="text-center text-sm text-muted-foreground">{pie}</div>}
    </div>
  );
}
