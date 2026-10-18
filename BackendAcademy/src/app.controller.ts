import { Body, Controller, Get, Post } from '@nestjs/common';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { AppService } from './app.service';

export class ExampleDto {
  @IsString()
  @IsNotEmpty({ message: 'name is required' })
  name: string;

  @IsEmail({}, { message: 'email must be a valid email' })
  email: string;
}

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('example')
  validateExample(@Body() dto: ExampleDto) {
    return { success: true, data: dto };
  }
}
