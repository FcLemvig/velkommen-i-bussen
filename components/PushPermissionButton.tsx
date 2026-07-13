"use client";

import { useState, useTransition } from "react";
import { BellRing } from "lucide-react";
import { savePushSubscriptionAction } from "@/app/dashboard/notifications/actions";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export function PushPermissionButton({ publicKey }: { publicKey: string }) {
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  async function enablePush() {
    setMessage("");

    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setMessage("Denne telefon/browser understøtter ikke push-notifikationer.");
      return;
    }

    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      setMessage("Push blev ikke slået til. Du kan prøve igen senere.");
      return;
    }

    const registration = await navigator.serviceWorker.register("/sw.js");
    const subscription =
      (await registration.pushManager.getSubscription()) ||
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      }));

    startTransition(async () => {
      const result = await savePushSubscriptionAction(subscription.toJSON(), navigator.userAgent);
      setMessage(result.message);
    });
  }

  return (
    <div className="grid gap-2 rounded-[24px] border border-bus/25 bg-bus/10 p-4">
      <div>
        <h2 className="font-bold text-ink">Push-notifikationer</h2>
        <p className="mt-1 text-sm text-slate-700">Få en besked på telefonen, når der sker noget vigtigt.</p>
      </div>
      <button type="button" onClick={enablePush} disabled={isPending} className="w-full gap-2 bg-bus text-white hover:bg-bus/90 sm:w-fit">
        <BellRing size={16} />
        {isPending ? "Slår til..." : "Slå push til"}
      </button>
      {message ? <p className="text-sm font-semibold text-ink">{message}</p> : null}
    </div>
  );
}
