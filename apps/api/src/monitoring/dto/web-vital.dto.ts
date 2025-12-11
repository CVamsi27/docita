import { IsString, IsNumber, IsOptional } from 'class-validator';

export class WebVitalDto {
  @IsString()
  name: string; // 'CLS' | 'FID' | 'FCP' | 'LCP' | 'TTFB' | 'INP'

  @IsNumber()
  value: number;

  @IsNumber()
  rating: number; // 0-100

  @IsString()
  @IsOptional()
  page?: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  sessionId?: string;
}
