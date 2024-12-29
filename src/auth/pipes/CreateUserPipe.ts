import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { CreateAuthDto } from '../dto/create-auth.dto';

@Injectable()
export class CreateUserPipe implements PipeTransform {
  private readonly saltRounds = 10;

  async transform(value: CreateAuthDto, metadata: ArgumentMetadata) {
    if (value.password) {
      const salt = await bcrypt.genSalt(this.saltRounds);
      value.password = await bcrypt.hash(value.password, salt);
    }

    return value;
  }
}
