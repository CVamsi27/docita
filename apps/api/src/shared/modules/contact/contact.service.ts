import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import type {
  ContactInquiry,
  ContactResponse,
  SupportInquiry,
} from '@workspace/types';

type ContactInquiryDto = ContactInquiry;

@Injectable()
export class ContactService {
  private readonly logger = new Logger('ContactService');

  constructor(private readonly prisma: PrismaService) {}

  async submitInquiry(data: ContactInquiryDto): Promise<ContactResponse> {
    if (!data.name || !data.email || !data.message) {
      throw new BadRequestException(
        'Name, email, and message are required fields',
      );
    }

    if (!this.isValidEmail(data.email)) {
      throw new BadRequestException('Invalid email format');
    }

    const inquiry = await this.prisma.supportInquiry.create({
      data: {
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        clinic: data.clinic?.trim() || null,
        message: data.message.trim(),
      },
      select: {
        id: true,
      },
    });

    this.logger.log(
      `New contact inquiry received: ${inquiry.id} from ${data.email}`,
    );

    return {
      success: true,
      id: inquiry.id,
      message: 'Thank you for your inquiry. We will get back to you soon.',
    };
  }

  async listInquiries(limit = 100): Promise<SupportInquiry[]> {
    const inquiries = await this.prisma.supportInquiry.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 200),
    });

    return inquiries.map((inquiry) => ({
      ...inquiry,
      clinic: inquiry.clinic ?? null,
    }));
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
