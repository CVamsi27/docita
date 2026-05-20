import {
  Controller,
  Post,
  Body,
  BadRequestException as _BadRequestException,
  UsePipes,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '@/shared/modules/auth/auth/public.decorator';
import { ContactService } from './contact.service';

import {
  ContactInquiryDto,
  ContactResponseDto,
  ContactInquirySchema,
} from './dto/contact.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { ZodValidationPipe } from '@/shared/common/pipes/zod-validation.pipe';

@Controller('contact')
@Public()
export class ContactController {
  constructor(private contactService: ContactService) {}

  @Post('inquiry')
  @Throttle({ short: { ttl: 60000, limit: 3 } })
  @ZodSerializerDto(ContactResponseDto)
  @UsePipes(new ZodValidationPipe(ContactInquirySchema))
  submitInquiry(@Body() dto: ContactInquiryDto) {
    return this.contactService.submitInquiry(dto);
  }
}
