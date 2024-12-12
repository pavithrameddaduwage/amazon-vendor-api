import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { AuthModule } from '../auth.module';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RealTimeTrafficReport } from './entities/vendor-realtime-traffic.entity';
import { RealTimeTrafficReportRepository } from './entities/real-time-traffic-report.repository';

@Module({
  imports: [
    HttpModule,
    AuthModule,
    TypeOrmModule.forFeature([RealTimeTrafficReport, RealTimeTrafficReportRepository]),
  ],
  providers: [ReportsService],
  exports: [ReportsService], // Export for use in other parts of the application
})
export class ReportsModule {}
