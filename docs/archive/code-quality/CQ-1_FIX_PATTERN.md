/\*\*

- BEFORE & AFTER EXAMPLE: CQ-1 TypeScript Strict Mode Fixes
-
- This file shows the exact pattern to apply to 70+ controller/service files
- Replace: @Request() req: any
- With: @Request() req: RequestWithUser
-
- Then apply to all 70+ locations identified
  \*/

// ============================================================================
// ❌ BEFORE (violates strict mode - 70+ files look like this)
// ============================================================================

// import { Controller, Get, Request } from '@nestjs/common';
//
// @Controller('auth')
// export class AuthController {
// @Get('profile')
// getProfile(@Request() req: any) { // ❌ `any` type
// return {
// userId: req.user?.id, // no type safety
// clinicId: req.clinic?.id, // could be anything
// };
// }
// }

// ============================================================================
// ✅ AFTER (strict mode compliant)
// ============================================================================

import { Controller, Get, Request } from '@nestjs/common';
import { RequestWithUser } from '../common/types/common.types'; // NEW

@Controller('auth')
export class AuthController {
@Get('profile')
getProfile(@Request() req: RequestWithUser) { // ✅ Typed properly
return {
userId: req.user?.id, // ✅ TypeScript knows req.user exists
clinicId: req.clinic?.id, // ✅ TypeScript knows req.clinic exists
};
}
}

/\*\*

- ============================================================================
- QUICK FIX CHECKLIST
- ============================================================================
-
- Apply this to all 70+ files:
-
- 1.  Import RequestWithUser at top:
- import { RequestWithUser } from '../common/types/common.types';
-
- 2.  Replace all: @Request() req: any
- With: @Request() req: RequestWithUser
-
- 3.  For files in nested modules, adjust import path:
- - src/modules/auth/ → ../../common/types/common.types
- - src/modules/auth/dto/ → ../../../common/types/common.types
-
- 4.  Verify build still works:
- pnpm build
-
- 5.  Verify all types correct:
- pnpm lint
-
- ============================================================================
- FILES TO UPDATE (70+ files)
- ============================================================================
-
- Using grep to find all:
- grep -r "@Request() req: any" apps/api/src/
-
- Files include:
- - apps/api/src/modules/auth/auth.controller.ts (3 occurrences)
- - apps/api/src/modules/dashboard/dashboard.controller.ts (1 occurrence)
- - apps/api/src/modules/patients/medical-history.controller.ts (1 occurrence)
- - apps/api/src/modules/medical-coding/medical-coding.controller.ts (8 occurrences)
- - apps/api/src/modules/fhir/fhir.controller.ts (10 occurrences)
- - apps/api/src/modules/whatsapp/whatsapp.controller.ts (1 occurrence)
- ... and 60+ more locations in services and listeners
-
- ============================================================================
- AUTOMATION OPTION
- ============================================================================
-
- Use sed to automate replacement:
-
- sed -i 's/@Request() req: any/@Request() req: RequestWithUser/g' \
- apps/api/src/modules/\*_\/_.ts
-
- Then manually add import statements where needed:
- import { RequestWithUser } from '../common/types/common.types';
-
- ============================================================================
  \*/
