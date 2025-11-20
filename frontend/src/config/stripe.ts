import { loadStripe, Stripe } from '@stripe/stripe-js';

// This will be loaded from backend API
let stripePromise: Promise<Stripe | null> | null = null;

export const getStripe = async (): Promise<Stripe | null> => {
  if (!stripePromise) {
    // Fetch publishable key from backend
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${API_URL}/api/payments/config`);
      const data = await response.json();

      if (data.success && data.data.publishableKey) {
        stripePromise = loadStripe(data.data.publishableKey);
      } else {
        console.error('Failed to get Stripe publishable key');
        stripePromise = Promise.resolve(null);
      }
    } catch (error) {
      console.error('Error loading Stripe:', error);
      stripePromise = Promise.resolve(null);
    }
  }

  return stripePromise;
};

export const stripeConfig = {
  appearance: {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#3b82f6',
      colorBackground: '#ffffff',
      colorText: '#1f2937',
      colorDanger: '#ef4444',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      spacingUnit: '4px',
      borderRadius: '8px',
    },
  },
  locale: 'pt-BR' as const,
};
