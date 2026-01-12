import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { ContactService } from './contact.service';

import { ContactInquiryDto } from './dto/contact.dto';

@Controller('contact')
export class ContactController {
  constructor(private contactService: ContactService) {}

  @Post('inquiry')
  submitInquiry(@Body() dto: ContactInquiryDto) {
    return this.contactService.submitInquiry(dto);
  }
}
