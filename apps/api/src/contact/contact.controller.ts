import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { ContactService } from './contact.service';

interface ContactInquiryDto {
  name: string;
  email: string;
  clinic?: string;
  message: string;
}

@Controller('contact')
export class ContactController {
  constructor(private contactService: ContactService) {}

  @Post('inquiry')
  submitInquiry(@Body() data: ContactInquiryDto) {
    if (!data.name || !data.email || !data.message) {
      throw new BadRequestException(
        'Name, email, and message are required fields',
      );
    }

    return this.contactService.submitInquiry(data);
  }
}
