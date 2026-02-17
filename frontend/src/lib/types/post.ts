import { Platform, PostType } from './api';

export interface PlatformSelection {
  platform: Platform;
  accountId: string;
  accountUsername?: string;
  postType: PostType;
}
