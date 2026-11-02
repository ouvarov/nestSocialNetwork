import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsIn,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

import {
  ASSIGNABLE_ROLES,
  type AssignableRole,
  MAX_GROUP_MEMBERS,
} from '../group-rules';

const MAX_TITLE_LENGTH = 100;

const cleanTitle = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.replaceAll('\0', '').trim() : value;

class GroupTitleDto {
  @ApiProperty({ minLength: 1, maxLength: MAX_TITLE_LENGTH })
  @Transform(cleanTitle)
  @IsString()
  @Length(1, MAX_TITLE_LENGTH)
  title: string;
}

class CreateGroupDto extends GroupTitleDto {
  @ApiProperty({
    type: [String],
    format: 'uuid',
    description: 'The other people; you become the owner',
  })
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_GROUP_MEMBERS - 1)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  memberIds: string[];
}

class AddMembersDto {
  @ApiProperty({
    type: [String],
    format: 'uuid',
    description: 'People already in the group are skipped',
  })
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_GROUP_MEMBERS - 1)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  userIds: string[];
}

class SetRoleDto {
  @ApiProperty({ enum: ASSIGNABLE_ROLES })
  @IsIn(ASSIGNABLE_ROLES)
  role: AssignableRole;
}

class TransferOwnerDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  userId: string;
}

export {
  AddMembersDto,
  CreateGroupDto,
  GroupTitleDto,
  SetRoleDto,
  TransferOwnerDto,
};
