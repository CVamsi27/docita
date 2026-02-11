import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { ContactService } from './contact.service';

import { ContactInquiryDto, ContactResponseDto } from './dto/contact.dto';
import { ZodSerializerDto } from 'nestjs-zod';

@Controller('contact')
@Public()
export class ContactController {
  constructor(private contactService: ContactService) {}

  @Post('inquiry')
  @ZodSerializerDto(ContactResponseDto)
  submitInquiry(@Body() dto: ContactInquiryDto) {
    return this.contactService.submitInquiry(dto);
  }
}
