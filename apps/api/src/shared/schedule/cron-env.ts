import { getEnv } from '@/shared/modules/config/app-config';

/**
 * Nest Schedule `disabled` flag: when ENABLE_SCHEDULERS=false on the API process,
 * crons do not register; the worker process sets ENABLE_SCHEDULERS=true and runs them.
 */
export function isCronDisabledInThisProcess(): boolean {
  return getEnv().ENABLE_SCHEDULERS === false;
}
