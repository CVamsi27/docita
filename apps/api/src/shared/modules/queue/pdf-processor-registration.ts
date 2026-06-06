import { getEnv } from '@/shared/modules/config/app-config';

/** Whether this process should register Bull/pdf queue consumers (API vs worker split). */
export function shouldRegisterPdfQueueHandlers(): boolean {
  const env = getEnv();
  if (!env.ENABLE_SCHEDULERS) return false;
  return !(
    env.QUEUE_BACKEND === 'postgres' && env.WORKER_ENTRYPOINT !== 'worker'
  );
}
