"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";

type BackButtonProps = {
  label?: string;
};

export function BackButton({ label = "Retour" }: BackButtonProps) {
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="gap-1"
      onClick={() => router.back()}
      aria-label={label}
    >
      <ArrowLeft className="size-4" />
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}
