import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SearchService, SearchEntityType } from './search.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '@workspace/types';

@ApiTags('search')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('search')
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
    const searchTypes = types
      ? (types.split(',') as SearchEntityType[])
      : ['all' as SearchEntityType];

    return this.searchService.search({
      clinicId: req.user.clinicId!,
      query,
      types: searchTypes,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }
}
