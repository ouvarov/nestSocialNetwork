import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema()
export class User {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  userName: string;

  @Prop()
  id: number;

  @Prop({ default: '' })
  imageUrl: string;

  @Prop({ default: [] })
  following: [];

  @Prop({ default: [] })
  followers: [];

  @Prop({ default: '' })
  description: string;

  @Prop({ default: '' })
  created: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
