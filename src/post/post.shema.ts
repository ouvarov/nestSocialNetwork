import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class Post {
  @Prop({ default: '' })
  ownerId: string;

  @Prop({ default: '', required: true })
  text: string;

  @Prop({ default: '' })
  image: string;

  @Prop({ default: [] })
  likes: [];
}

export const PostSchema = SchemaFactory.createForClass(Post);
