import { useEffect, useState } from 'react';
import { initializeAWS, buildVoiceLookup } from '../services/awsService';
import { useVoicesDataStore } from '../store';

export function useAWSServices() {
  const { awsInitialized, setVoicesData, setAwsInitialized } = useVoicesDataStore();
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (awsInitialized) return;
    let cancelled = false;

    (async () => {
      try {
        await initializeAWS();
        if (cancelled) return;
        const { voices, voicesDesc } = await buildVoiceLookup();
        if (cancelled) return;
        setVoicesData(voices, voicesDesc);
        setAwsInitialized(true);
      } catch (err) {
        if (!cancelled) setError(err as Error);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return { initialized: awsInitialized, error };
}
