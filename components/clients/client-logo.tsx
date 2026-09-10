import { cn } from "@/lib/utils";

type ClientLogoSize = "sm" | "md" | "lg";

type ClientLogoProps = {
  src?: string | null;
  name: string;
  size?: ClientLogoSize;
  className?: string;
};

/** Slot carré fixe : tableau / cartes / fiche. */
const SIZE_CLASS: Record<ClientLogoSize, string> = {
  sm: "size-12",
  md: "size-16",
  lg: "size-26",
};

const PLACEHOLDER_TEXT: Record<ClientLogoSize, string> = {
  sm: "text-[10px] font-semibold",
  md: "text-sm font-semibold",
  lg: "text-lg font-semibold",
};

/**
 * Logo client dans un slot carré fixe : image centrée, ratio préservé.
 * Sans image : placeholder carré (initiales).
 */
export function ClientLogo({
  src,
  name,
  size = "md",
  className,
}: ClientLogoProps) {
  const initials = name.slice(0, 2).toUpperCase();

  if (src) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden rounded-[8px]",
          SIZE_CLASS[size],
          className,
        )}
      >
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-auto max-h-full w-auto max-w-full object-contain"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-muted",
        SIZE_CLASS[size],
        PLACEHOLDER_TEXT[size],
        className,
      )}
    >
      {initials}
    </div>
  );
}
