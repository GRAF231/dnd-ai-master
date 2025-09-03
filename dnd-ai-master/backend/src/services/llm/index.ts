export * from './openrouter.js';
export * from './dmAgent.js';

import { createOpenRouterService } from './openrouter.js';
import { DMAgentService } from './dmAgent.js';

export function createDMAgent(): DMAgentService {
  const openRouter = createOpenRouterService();
  return new DMAgentService(openRouter);
}
