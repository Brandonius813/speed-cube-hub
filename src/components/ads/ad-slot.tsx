"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const ADSENSE_CLIENT = "ca-pub-3027565303141354";

type AdFormat = "display" | "multiplex";

function getVisibilityClass(showOnMobile: boolean, showOnDesktop: boolean) {
  if (showOnMobile && showOnDesktop) return "";
  if (showOnMobile) return "lg:hidden";
  if (showOnDesktop) return "hidden lg:block";
  return "hidden";
}

export function AdSlot({
  slotId,
  format = "display",
  className,
  minHeight = 280,
  showOnMobile = true,
  showOnDesktop = true,
  disabled = false,
}: {
  slotId?: string | null;
  format?: AdFormat;
  className?: string;
  minHeight?: number;
  showOnMobile?: boolean;
  showOnDesktop?: boolean;
  disabled?: boolean;
}) {
  const adRef = useRef<HTMLModElement | null>(null);
  const hasRequestedAd = useRef(false);

  useEffect(() => {
    if (!slotId || disabled) return;

    const node = adRef.current;
    if (!node || hasRequestedAd.current) return;
    if (node.getAttribute("data-adsbygoogle-status")) return;

    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
      hasRequestedAd.current = true;
    } catch {
      // Ignore local/dev timing errors until the AdSense script is available.
    }
  }, [disabled, slotId]);

  if (!slotId || disabled) {
    return null;
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border/50 bg-card/80 p-3 shadow-sm",
        getVisibilityClass(showOnMobile, showOnDesktop),
        className
      )}
    >
      <p className="mb-2 text-[10px] uppercase tracking-[0.28em] text-muted-foreground/60">
        Sponsored
      </p>
      <ins
        ref={adRef}
        className="adsbygoogle block w-full overflow-hidden"
        style={{ display: "block", minHeight }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slotId}
        data-ad-format={format === "multiplex" ? "autorelaxed" : "auto"}
        data-full-width-responsive="true"
      />
    </div>
  );
}
