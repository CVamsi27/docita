

import type {
  IAccessContext,
  IAccessControlService,
  IAccessDecision,
  IUpgradeOption,
} from "@/lib/access-control/interfaces";

export class LoggingAccessControlDecorator implements IAccessControlService {
  constructor(private wrapped: IAccessControlService) {}

  async canAccess(context: IAccessContext): Promise<IAccessDecision> {
    const decision = await this.wrapped.canAccess(context);
    return decision;
  }

  canAccessSync(context: IAccessContext): IAccessDecision {
    const decision = this.wrapped.canAccessSync(context);
    return decision;
  }

  getReason(context: IAccessContext): string {
    const reason = this.wrapped.getReason(context);
    
    return reason;
  }

  getUpgradeOptions(context: IAccessContext): IUpgradeOption[] {
    const options = this.wrapped.getUpgradeOptions(context);
    
    return options;
  }
}
