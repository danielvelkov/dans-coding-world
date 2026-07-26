import {
  CreatePostDto,
  UpdatePostDto,
} from '@dans-coding-world/shared-post-dto';

export type SubmitData<M extends 'create' | 'edit'> = M extends 'create'
  ? Omit<CreatePostDto, 'authorId'>
  : Omit<UpdatePostDto, 'userId' | 'postId'>;

export type CreateSubmitData = SubmitData<'create'>;
export type EditSubmitData = SubmitData<'edit'>;
