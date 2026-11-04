import trazos from "@/configuracion/palta.json";
import { inclinacionPalta } from "@/configuracion/marca.json";

/** El favicon se genera con estos mismos trazos y los tokens de globals.css. */
export function Palta({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 80" className={className} aria-hidden="true" fill="none">
      <g transform={`rotate(${inclinacionPalta} 32 40)`}>
        {trazos.map(({ color, trazo }) => <path key={color} d={trazo} fill={`var(--${color})`} />)}
      </g>
    </svg>
  );
}
