import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';
import { GuidedTourService } from './guided-tour.service';
import {
  GuidedTourStateRecord,
  GuidedTourUpdate,
  USER_REPOSITORY_TOKEN,
} from '@/domains/users/core/repositories/user.repository.interface';
import { CLOCK_PORT } from '@/shared/common/ports/clock.port';

type RepoMock = {
  getGuidedTour: jest.Mock<
    (userId: string) => Promise<GuidedTourStateRecord | null>
  >;
  updateGuidedTour: jest.Mock<
    (userId: string, patch: GuidedTourUpdate) => Promise<GuidedTourStateRecord>
  >;
};

describe('GuidedTourService', () => {
  const NOW = new Date('2026-06-21T10:00:00.000Z');
  let service: GuidedTourService;
  let repo: RepoMock;

  beforeEach(async () => {
    repo = {
      getGuidedTour:
        jest.fn<(userId: string) => Promise<GuidedTourStateRecord | null>>(),
      updateGuidedTour: jest.fn<
        (
          userId: string,
          patch: GuidedTourUpdate,
        ) => Promise<GuidedTourStateRecord>
      >((_userId, patch) =>
        Promise.resolve({
          status: 'NOT_STARTED',
          lastStep: 0,
          completedAt: null,
          checklistDismissedAt: null,
          ...patch,
        }),
      ),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        GuidedTourService,
        { provide: USER_REPOSITORY_TOKEN, useValue: repo },
        { provide: CLOCK_PORT, useValue: { now: () => NOW } },
      ],
    }).compile();

    service = moduleRef.get(GuidedTourService);
  });

  it('stamps completedAt when the tour is COMPLETED', async () => {
    await service.updateGuidedTour('u1', { status: 'COMPLETED' });
    expect(repo.updateGuidedTour).toHaveBeenCalledWith('u1', {
      status: 'COMPLETED',
      completedAt: NOW,
    });
  });

  it('stamps completedAt when the tour is SKIPPED', async () => {
    await service.updateGuidedTour('u1', { status: 'SKIPPED' });
    expect(repo.updateGuidedTour).toHaveBeenCalledWith('u1', {
      status: 'SKIPPED',
      completedAt: NOW,
    });
  });

  it('does not stamp completedAt for a resumable IN_PROGRESS step', async () => {
    await service.updateGuidedTour('u1', {
      status: 'IN_PROGRESS',
      lastStep: 2,
    });
    expect(repo.updateGuidedTour).toHaveBeenCalledWith('u1', {
      status: 'IN_PROGRESS',
      lastStep: 2,
    });
  });

  it('maps checklist dismissal to a timestamp, and un-dismissal to null', async () => {
    await service.updateGuidedTour('u1', { checklistDismissed: true });
    expect(repo.updateGuidedTour).toHaveBeenCalledWith('u1', {
      checklistDismissedAt: NOW,
    });

    await service.updateGuidedTour('u1', { checklistDismissed: false });
    expect(repo.updateGuidedTour).toHaveBeenCalledWith('u1', {
      checklistDismissedAt: null,
    });
  });

  it('throws when the user has no record on read', async () => {
    repo.getGuidedTour.mockResolvedValue(null);
    await expect(service.getGuidedTour('missing')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
