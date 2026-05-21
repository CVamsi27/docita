import {
  Controller,
  ForbiddenException,
  Get,
  Query,
  UseGuards as _UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SearchService, SearchEntityType } from './search.service';
import { parseStringEnumMember } from '@workspace/utils';

const SEARCH_ENTITY_TYPES: SearchEntityType[] = [
  'patient',
  'appointment',
  'prescription',
  'all',
];

function parseSearchEntityTypes(types: string | undefined): SearchEntityType[] {
  if (!types?.trim()) {
    return ['all'];
  }
  const parsed = types
    .split(',')
    .map((value) => value.trim())
    .flatMap((value) => {
      const match = parseStringEnumMember(SEARCH_ENTITY_TYPES, value);
      return match ? [match] : [];
    });
  return parsed.length > 0 ? parsed : ['all'];
}
import { APP_ACCESS_TARGETS, AuthenticatedRequest } from '@workspace/types';
import { Role } from '@workspace/db';
import { Roles } from '@/shared/modules/auth/auth/roles.decorator';
import { getDbRolesForTarget } from '@/shared/modules/auth/auth/access-matrix.util';

@ApiTags('search')
@ApiBearerAuth('JWT-auth')
@Controller('search')
@Roles(
  ...new Set([
    ...getDbRolesForTarget(APP_ACCESS_TARGETS.API_PATIENTS_READ),
    Role.INTERNAL,
  ]),
)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({
    summary: 'Unified search across patients, appointments, prescriptions',
  })
  @ApiQuery({ name: 'q', description: 'Search query (min 2 characters)' })
  @ApiQuery({
    name: 'types',
    required: false,
    description:
      'Entity types to search (patient,appointment,prescription,all)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Max results (default 20)',
  })
  async search(
    @Request() req: AuthenticatedRequest,
    @Query('q') query: string,
    @Query('types') types?: string,
    @Query('limit') limit?: string,
  ) {
    if (!req.user.clinicId) {
      throw new ForbiddenException('Search requires a clinic context');
    }

    const searchTypes = parseSearchEntityTypes(types);

    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    const safeLimit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 100)
      : 20;

    return this.searchService.search({
      clinicId: req.user.clinicId,
      query,
      types: searchTypes,
      limit: safeLimit,
    });
  }
}
