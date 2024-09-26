import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserEntity } from '../../user/entities/user.entity';

@Injectable()
export class HashPasswordPipe implements PipeTransform {
  private readonly saltRounds = 10;

  async transform(value: UserEntity, metadata: ArgumentMetadata) {
    value.created = new Date();
    if (value.password) {
      const salt = await bcrypt.genSalt(this.saltRounds);
      value.password = await bcrypt.hash(value.password, salt);
    }

    return value;
  }
}
