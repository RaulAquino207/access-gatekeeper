import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AccessRequestsModule } from './access-requests/access-requests.module';

@Module({
  imports: [AccessRequestsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
