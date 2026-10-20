import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';
import { DoctorsQueryService } from './doctors-query.service';
import {
  doctorResponseSchema,
  doctorEducationSchema,
  doctorCertificationSchema,
  doctorSpecializationSchema,
} from '@workspace/types';
import {
  DOCTOR_PERSISTENCE_PORT,
  type DoctorPersistencePort,
} from '@/domains/doctors/application/ports/doctor-persistence.port';
import { StoredFileUrlResolverService } from '@/domains/documents/application/services/stored-file-url-resolver.service';

describe('DoctorsQueryService', () => {
  let service: DoctorsQueryService;
  let findEducation: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
  let findCertifications: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
  let findSpecializations: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
  let findProfile: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
  let findLinkedDoctors: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
  let findDirectDoctors: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
  let prisma: jest.Mocked<DoctorPersistencePort>;
  let storedFileUrlResolver: jest.Mocked<StoredFileUrlResolverService>;

  beforeEach(() => {
    findEducation = jest.fn<(...args: unknown[]) => Promise<unknown>>();
    findCertifications = jest.fn<(...args: unknown[]) => Promise<unknown>>();
    findSpecializations = jest.fn<(...args: unknown[]) => Promise<unknown>>();
    findProfile = jest.fn<(...args: unknown[]) => Promise<unknown>>();
    findLinkedDoctors = jest.fn<(...args: unknown[]) => Promise<unknown>>();
    findDirectDoctors = jest.fn<(...args: unknown[]) => Promise<unknown>>();
    prisma = {
      doctorEducation: { findMany: findEducation },
      doctorCertification: { findMany: findCertifications },
      doctorSpecialization: { findMany: findSpecializations },
      doctorClinic: { findMany: findLinkedDoctors, findFirst: jest.fn() },
      user: { findMany: findDirectDoctors, findFirst: findProfile },
    } as unknown as jest.Mocked<DoctorPersistencePort>;

    storedFileUrlResolver = Object.create(
      StoredFileUrlResolverService.prototype,
    ) as jest.Mocked<StoredFileUrlResolverService>;
    storedFileUrlResolver.resolveWithStoredUrl = jest.fn();
    (storedFileUrlResolver.resolveWithStoredUrl as jest.Mock).mockResolvedValue(
      { url: null, storedUrl: null } as never,
    );

    service = new DoctorsQueryService(prisma, storedFileUrlResolver);
  });

  describe('response contract mapping', () => {
    const freshDoctor = {
      educationHistory: [],
      certifications: [],
      additionalSpecializations: [],
      id: 'doctor-new',
      email: 'new-doctor@example.com',
      name: 'New Doctor',
      role: 'ADMIN_DOCTOR',
      clinicId: 'clinic-1',
      specialization: null,
      hospitalRole: null,
      qualification: null,
      registrationNumber: null,
      registrationCouncil: null,
      registrationStateCode: null,
      hprId: null,
      licenseNumber: null,
      licenseExpiry: null,
      signatureUrl: null,
      signatureUploadedAt: null,
      verificationStatus: 'UNVERIFIED' as const,
      verificationSource: null,
      verificationRef: null,
      verificationReason: null,
      verificationData: null,
      verificationCheckedAt: null,
      profilePhotoUrl: null,
      phoneNumber: null,
      bio: null,
      yearsOfExperience: null,
      consultationFee: null,
      registrationCertificateUrl: null,
      verifiedByAdminId: null,
      verifiedByAdminAt: null,
      createdAt: new Date('2026-10-10T00:00:00Z'),
      updatedAt: new Date('2026-10-10T00:00:00Z'),
    };

    const education = {
      id: 'education-1',
      doctorId: freshDoctor.id,
      degree: 'MBBS',
      institution: 'Medical College',
      fieldOfStudy: null,
      location: null,
      startYear: 0,
      endYear: null,
      isOngoing: false,
      grade: null,
      thesis: null,
      order: 0,
      createdAt: freshDoctor.createdAt,
      updatedAt: freshDoctor.updatedAt,
    };
    const certification = {
      id: 'certification-1',
      doctorId: freshDoctor.id,
      name: 'Clinical Certificate',
      issuingBody: 'Medical Council',
      issueDate: freshDoctor.createdAt,
      expiryDate: null,
      credentialId: null,
      credentialUrl: null,
      createdAt: freshDoctor.createdAt,
      updatedAt: freshDoctor.updatedAt,
    };
    const specialization = {
      id: 'specialization-1',
      doctorId: freshDoctor.id,
      specialization: 'GENERAL_PRACTICE' as const,
      certificationId: null,
      yearsOfPractice: 0,
      isPrimary: true,
      createdAt: freshDoctor.createdAt,
    };

    it('maps existing profiles with populated history through the same canonical response', async () => {
      findProfile.mockResolvedValueOnce({
        ...freshDoctor,
        educationHistory: [education],
        certifications: [certification],
        additionalSpecializations: [specialization],
      });
      const parsed = doctorResponseSchema.parse(
        await service.findOne(freshDoctor.id, freshDoctor.clinicId),
      );
      expect(parsed.educationHistory?.[0]).toMatchObject({
        degree: education.degree,
        institution: education.institution,
        startYear: 0,
        order: 0,
      });
      expect(parsed.educationHistory?.[0]?.fieldOfStudy).toBeUndefined();
      expect(parsed.certifications?.[0]).toMatchObject({
        name: certification.name,
        issuingBody: certification.issuingBody,
        issueDate: certification.issueDate,
      });
      expect(parsed.certifications?.[0]?.expiryDate).toBeUndefined();
      expect(parsed.additionalSpecializations?.[0]).toMatchObject({
        specialization: specialization.specialization,
        yearsOfPractice: 0,
      });
      expect(
        parsed.additionalSpecializations?.[0]?.certificationId,
      ).toBeUndefined();
    });

    it('preserves configured history metadata in an existing profile', async () => {
      const configuredEducation = {
        ...education,
        fieldOfStudy: 'Medicine',
        location: 'Hyderabad',
        startYear: 2009,
        endYear: 2014,
        grade: 'Distinction',
        thesis: 'Clinical care',
      };
      const configuredCertification = {
        ...certification,
        expiryDate: new Date('2027-10-10T00:00:00Z'),
        credentialId: 'CRED-001',
        credentialUrl: 'https://example.com/credential',
      };
      const configuredSpecialization = {
        ...specialization,
        certificationId: configuredCertification.id,
        yearsOfPractice: 5,
      };
      findProfile.mockResolvedValueOnce({
        ...freshDoctor,
        educationHistory: [configuredEducation],
        certifications: [configuredCertification],
        additionalSpecializations: [configuredSpecialization],
      });
      const parsed = doctorResponseSchema.parse(
        await service.findOne(freshDoctor.id, freshDoctor.clinicId),
      );
      expect(parsed.educationHistory?.[0]).toEqual(configuredEducation);
      expect(parsed.certifications?.[0]).toEqual(configuredCertification);
      expect(parsed.additionalSpecializations?.[0]).toEqual(
        configuredSpecialization,
      );
    });

    it('uses the canonical history projections for standalone read endpoints', async () => {
      findEducation.mockResolvedValueOnce([education]);
      findCertifications.mockResolvedValueOnce([certification]);
      findSpecializations.mockResolvedValueOnce([specialization]);
      const parsedEducation = doctorEducationSchema
        .array()
        .parse(await service.getEducationHistory(freshDoctor.id));
      const parsedCertificates = doctorCertificationSchema
        .array()
        .parse(await service.getCertifications(freshDoctor.id));
      const parsedSpecializations = doctorSpecializationSchema
        .array()
        .parse(await service.getSpecializations(freshDoctor.id));
      expect(parsedEducation[0]?.doctorId).toBe(freshDoctor.id);
      expect(parsedEducation[0]?.startYear).toBe(0);
      expect(parsedCertificates[0]?.credentialId).toBeUndefined();
      expect(parsedSpecializations[0]?.yearsOfPractice).toBe(0);
      expect(findEducation).toHaveBeenCalledWith({
        where: { doctorId: freshDoctor.id },
        orderBy: { order: 'asc' },
      });
      expect(findCertifications).toHaveBeenCalledWith({
        where: { doctorId: freshDoctor.id },
        orderBy: { issueDate: 'desc' },
      });
      expect(findSpecializations).toHaveBeenCalledWith({
        where: { doctorId: freshDoctor.id },
      });
    });

    it('maps a newly onboarded profile through the canonical detail contract', async () => {
      findProfile.mockResolvedValueOnce(freshDoctor);
      const result = await service.findOne(
        freshDoctor.id,
        freshDoctor.clinicId,
      );
      const parsed = doctorResponseSchema.parse(result);
      expect(parsed.registrationNumber).toBeUndefined();
      expect(parsed.bio).toBeUndefined();
      expect(parsed.phoneNumber).toBeUndefined();
      expect(parsed.yearsOfExperience).toBeUndefined();
      expect(parsed.consultationFee).toBeUndefined();
      expect(parsed.registrationCertificateUrl).toBeUndefined();
      expect(parsed.verifiedByAdminId).toBeNull();
      expect(parsed.verifiedByAdminAt).toBeNull();
      expect(parsed.clinicId).toBe(freshDoctor.clinicId);
    });

    it('maps fresh list entries without nullable optional metadata', async () => {
      findLinkedDoctors.mockResolvedValueOnce([{ doctor: freshDoctor }]);
      findDirectDoctors.mockResolvedValueOnce([]);
      const results = await service.findAll(freshDoctor.clinicId);
      expect(results).toHaveLength(1);
      const parsed = doctorResponseSchema.parse(results[0]);
      expect(parsed.specialization).toBeUndefined();
      expect(parsed.registrationNumber).toBeUndefined();
      expect(parsed.consultationFee).toBeUndefined();
    });

    it('preserves configured metadata and valid zero values on the shared update mapper', async () => {
      const configured = {
        ...freshDoctor,
        specialization: 'GENERAL_PRACTICE' as const,
        qualification: 'MBBS',
        registrationNumber: 'REG-001',
        registrationCouncil: 'Medical Council',
        registrationStateCode: 'TS',
        phoneNumber: '9876543210',
        bio: 'General practice',
        yearsOfExperience: 0,
        consultationFee: 0,
        signatureUrl: 'stored://doctor-signature.png',
      };
      jest
        .spyOn(storedFileUrlResolver, 'resolveWithStoredUrl')
        .mockResolvedValueOnce({
          url: 'https://example.com/signature.png',
          storedUrl: configured.signatureUrl,
        });
      const parsed = doctorResponseSchema.parse(
        await service.resolveDoctorSignatureUrl(configured),
      );
      expect(parsed.registrationNumber).toBe(configured.registrationNumber);
      expect(parsed.bio).toBe(configured.bio);
      expect(parsed.phoneNumber).toBe(configured.phoneNumber);
      expect(parsed.yearsOfExperience).toBe(0);
      expect(parsed.consultationFee).toBe(0);
      expect(parsed.signatureStoredUrl).toBe(configured.signatureUrl);
    });
  });

  describe('findAll', () => {
    it('should return combined doctors list for a clinic', async () => {
      (prisma.doctorClinic.findMany as jest.Mock).mockResolvedValueOnce([
        {
          doctor: {
            id: 'doc-1',
            role: 'DOCTOR',
            email: 'doc@example.com',
            name: 'Dr. Smith',
            specialization: null,
            hospitalRole: null,
            qualification: null,
            registrationNumber: null,
            registrationCouncil: null,
            registrationStateCode: null,
            verificationStatus: 'PENDING',
            verificationReason: null,
            verificationCheckedAt: null,
            signatureUrl: null,
            profilePhotoUrl: null,
            yearsOfExperience: null,
            consultationFee: null,
            createdAt: new Date(),
          },
        },
      ] as never);
      (prisma.user.findMany as jest.Mock).mockResolvedValueOnce([] as never);

      const result = await service.findAll('clinic-1');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('lists only active clinic links and live accounts', async () => {
      (prisma.doctorClinic.findMany as jest.Mock).mockResolvedValueOnce(
        [] as never,
      );
      (prisma.user.findMany as jest.Mock).mockResolvedValueOnce([] as never);

      await service.findAll('clinic-1');

      // A departed doctor (inactive link) or a soft-deleted account must not
      // reach the staff picker or the public booking page.
      expect(prisma.doctorClinic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            clinicId: 'clinic-1',
            active: true,
            doctor: { deletedAt: null },
          },
        }),
      );
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            clinicId: 'clinic-1',
            deletedAt: null,
          }),
        }),
      );
    });

    it('should de-duplicate doctors appearing in both doctorClinic and user lists', async () => {
      const doctor = {
        id: 'doc-1',
        role: 'DOCTOR',
        email: 'doc@example.com',
        name: 'Dr. Smith',
        specialization: null,
        hospitalRole: null,
        qualification: null,
        registrationNumber: null,
        registrationCouncil: null,
        registrationStateCode: null,
        verificationStatus: 'PENDING',
        verificationReason: null,
        verificationCheckedAt: null,
        signatureUrl: null,
        profilePhotoUrl: null,
        yearsOfExperience: null,
        consultationFee: null,
        createdAt: new Date(),
      };
      (prisma.doctorClinic.findMany as jest.Mock).mockResolvedValueOnce([
        { doctor },
      ] as never);
      (prisma.user.findMany as jest.Mock).mockResolvedValueOnce([
        doctor,
      ] as never);

      const result = await service.findAll('clinic-1');

      const ids = result.map((d) => (d as { id: string }).id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });
  });

  describe('findOne', () => {
    it('should return doctor with resolved signature url', async () => {
      const user = {
        educationHistory: [],
        certifications: [],
        additionalSpecializations: [],
        id: 'doc-1',
        name: 'Dr. Smith',
        signatureUrl: 'stored://sig.png',
        registrationCertificateUrl: null,
      };
      (prisma.user.findFirst as jest.Mock).mockResolvedValueOnce(user as never);
      (storedFileUrlResolver.resolveWithStoredUrl as jest.Mock)
        .mockResolvedValueOnce({
          url: 'https://cdn.example.com/sig.png',
          storedUrl: 'stored://sig.png',
        } as never)
        .mockResolvedValueOnce({ url: null, storedUrl: null } as never);

      const result = await service.findOne('doc-1');

      expect(result).toMatchObject({ id: 'doc-1' });
    });

    it('should throw NotFoundException when doctor not found', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValueOnce(null as never);

      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should scope query to clinic when clinicId is provided', async () => {
      const user = {
        educationHistory: [],
        certifications: [],
        additionalSpecializations: [],
        id: 'doc-1',
        clinicId: 'clinic-1',
        name: 'Dr. Smith',
        signatureUrl: null,
        registrationCertificateUrl: null,
      };
      (prisma.user.findFirst as jest.Mock).mockResolvedValueOnce(user as never);
      // user.clinicId matches supplied clinicId, so no doctorClinic lookup needed
      // but mock findFirst in case the service checks it
      (prisma.doctorClinic.findFirst as jest.Mock).mockResolvedValueOnce({
        doctorId: 'doc-1',
        clinicId: 'clinic-1',
        active: true,
      } as never);

      await service.findOne('doc-1', 'clinic-1');

      expect(prisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'doc-1' }),
        }),
      );
    });
  });

  describe('getAvailableSpecializations', () => {
    it('offers only the active specialization set, not legacy enum values', () => {
      const options = service.getAvailableSpecializations();
      const values = options.map((o) => o.value);

      // Active set (packages/types ACTIVE_SPECIALIZATIONS) — 10 values.
      expect(values).toContain('CARDIOLOGY');
      expect(values).toContain('GENERAL_PRACTICE');
      expect(values.length).toBe(10);
      // Every option carries a human label.
      expect(options.every((o) => o.label.length > 0)).toBe(true);
    });
  });
});
