import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ReportsService } from './reports.service';

@Injectable()
export class ReportsScheduler {
  constructor(private reportsService: ReportsService) {}

  @Cron('0 */1 * * *') // Every hour
  async fetchRealTimeTrafficReport() {
    try {
      await this.reportsService.fetchAndStoreReport('GET_VENDOR_REAL_TIME_TRAFFIC_REPORT');
      console.log('Real-Time Traffic Report fetched successfully.');
    } catch (error) {
      console.error('Error fetching Real-Time Traffic Report:', error.message);
    }
  }
}
