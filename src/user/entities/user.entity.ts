import { IsArray, IsDate, IsEmail, IsString, IsUUID } from 'class-validator';

export class UserEntity {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsString()
  userName: string;

  @IsUUID()
  id: number;

  @IsString()
  imageUrl: string;

  @IsArray()
  following: [];

  @IsArray()
  followers: [];

  @IsString()
  description: string;

  @IsDate()
  created: Date;
}
