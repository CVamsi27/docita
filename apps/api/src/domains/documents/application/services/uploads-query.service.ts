// jscpd:ignore-start
import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import {
  DOCUMENT_PERSISTENCE_PORT,
  type DocumentPersistencePort,
} from '@/domains/documents/application/ports/document-persistence.port';

// AuditLogged: read-only upload session queries (mutations in UploadsCommandService)

@Injectable()
export class UploadsQueryService {
  constructor(
    @Inject(DOCUMENT_PERSISTENCE_PORT)
    private readonly persistence: DocumentPersistencePort,
  ) {}

  async getSession(id: string) {
    const session = await this.persistence.uploadSession.findFirst({
      where: { id },
      select: {
        id: true,
        status: true,
        fileUrl: true,
        purpose: true,
        doctorId: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    if (!session) throw new NotFoundException('Session not found');
    // jscpd:ignore-end

    return session;
  }
}
