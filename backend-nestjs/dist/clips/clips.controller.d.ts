import { Response } from 'express';
import { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { ClipsService, ClipVideoDto } from './clips.service';
export declare class ClipsController {
    private readonly clipsService;
    constructor(clipsService: ClipsService);
    clipVideo(user: CurrentUserPayload, body: ClipVideoDto, res: Response): Promise<void>;
}
