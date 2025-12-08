import { Injectable, BadRequestException, Logger } from '@nestjs/common';

interface ContactInquiryDto {
  name: string;
  email: string;
  clinic?: string;
  message: string;
}

@Injectable()
export class ContactService {
  private readonly logger = new Logger('ContactService');

  submitInquiry(data: ContactInquiryDto) {
    if (!data.name || !data.email || !data.message) {
      throw new BadRequestException(
        'Name, email, and message are required fields',
      );
    }

    if (!this.isValidEmail(data.email)) {
      throw new BadRequestException('Invalid email format');
    }

    // Log the inquiry (can be extended to send email or save to database)
    this.logger.log(
      `New contact inquiry from ${data.name} (${data.email}): ${data.message}`,
    );

    // Optional: Integrate with email service
    // await this.emailService.send({
    //   to: 'sales@docita.com',
    //   subject: `New Contact Inquiry from ${data.name}`,
    //   text: `Email: ${data.email}\nClinic: ${data.clinic || 'N/A'}\n\nMessage:\n${data.message}`,
    // });

    return {
      success: true,
      id: `inquiry_${Date.now()}`,
      message: 'Thank you for your inquiry. We will get back to you soon.',
    };
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
