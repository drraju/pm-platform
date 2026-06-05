import { Controller } from '@nestjs/common';
import { GoogleDriveService } from './google-drive.service';

@Controller('integrations/google-drive')
export class GoogleDriveController {
  constructor(private readonly googleDriveService: GoogleDriveService) {}
}
