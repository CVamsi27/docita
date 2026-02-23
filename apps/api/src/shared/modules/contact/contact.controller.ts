import {
  Controller,
  Post,
  Body,
  BadRequestException,
  UsePipes,
} from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { ContactService } from './contact.service';

import {
  ContactInquiryDto,
  ContactResponseDto,
  ContactInquirySchema,
} from './dto/contact.dto';
import { ZodSerializerDto } from 'nestjs-zod';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@Controller('contact')
@Public()
export class ContactController {
  constructor(private contactService: ContactService) {}

  @Post('inquiry')
  @ZodSerializerDto(ContactResponseDto)
  @UsePipes(new ZodValidationPipe(ContactInquirySchema))
  submitInquiry(@Body() dto: ContactInquiryDto) {
    return this.contactService.submitInquiry(dto);
  }
}
