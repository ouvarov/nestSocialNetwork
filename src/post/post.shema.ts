import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class Post {
  @Prop({ default: '' })
  ownerId: string;

  @Prop({ default: '', required: true })
  text: string;

  @Prop({ default: '' })
  imageUrl: string;

  @Prop({ default: [] })
  likes: string[];
}

export const PostSchema = SchemaFactory.createForClass(Post);
