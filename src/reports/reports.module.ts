import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';  // Import HttpModule
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RealTimeTrafficReport } from './entities/vendor-realtime-traffic.entity';

@Module({
  imports: [
    HttpModule,  // Add HttpModule here
    TypeOrmModule.forFeature([RealTimeTrafficReport]),
  ],
  providers: [ReportsService],
  controllers: [ReportsController],
})
export class ReportsModule {}
