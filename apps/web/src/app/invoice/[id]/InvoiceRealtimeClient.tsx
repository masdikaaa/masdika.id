"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface InvoiceRealtimeClientProps {
  invoiceNumber: string;
  isPaid: boolean;
}

export default function InvoiceRealtimeClient({ invoiceNumber, isPaid }: InvoiceRealtimeClientProps) {
  const router = useRouter();
  const hasNotified = useRef(false);

  useEffect(() => {
    if (isPaid || hasNotified.current) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/user/billing/invoice-status?invoiceNumber=${encodeURIComponent(invoiceNumber)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === "PAID") {
            hasNotified.current = true;
            clearInterval(interval);
            toast.success("Payment Successfully Validated!", {
              description: "Your invoice status has been updated in real-time."
            });
            router.refresh();
          }
        }
      } catch (error) {
        console.error("Failed to fetch invoice status:", error);
      }
    }, 3000); // Check every 3 seconds

    return () => clearInterval(interval);
  }, [invoiceNumber, isPaid, router]);

  return null; // This is a logic-only component, it doesn't render anything
}
