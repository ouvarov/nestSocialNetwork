import { IsString, IsEmail, IsNotEmpty, IsDate } from 'class-validator';

export class CreateAuthDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  userName: string;

  @IsDate()
  created: Date;
}
