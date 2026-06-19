/**
 * Razorpay checkout integration.
 *
 * Dynamically loads Razorpay's checkout script and opens the payment modal.
 */

let scriptPromise: Promise<void> | null = null;

function loadRazorpayScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    if (typeof (window as any).Razorpay !== "undefined") {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("Failed to load Razorpay SDK."));
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
}

interface RazorpayOptions {
  key_id: string;
  subscription_id: string;
  name: string;
  description: string;
  prefill?: { email?: string; contact?: string };
  callback_url?: string;
  modal?: { ondismiss?: () => void };
}

export async function openRazorpayCheckout(options: RazorpayOptions): Promise<void> {
  await loadRazorpayScript();

  return new Promise((resolve, reject) => {
    const rzp = new (window as any).Razorpay({
      ...options,
      handler: () => {
        // On successful payment Razorpay will redirect to callback_url,
        // so resolve is a no-op here.
        resolve();
      },
      modal: {
        ondismiss: () => {
          options.modal?.ondismiss?.();
          resolve();
        },
      },
    });

    rzp.open();
  });
}
