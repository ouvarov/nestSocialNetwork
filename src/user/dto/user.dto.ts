import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsUUID,
  IsArray,
} from 'class-validator';

export class UserDto {
  @IsString()
  @IsNotEmpty()
  userName: string;

  @IsString()
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @IsString()
  imageUrl: string;

  @IsArray()
  following: string[];

  @IsArray()
  followers: string[];

  @IsString()
  description: string;

  @IsString()
  created: Date;

  @IsString()
  password: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;
}
