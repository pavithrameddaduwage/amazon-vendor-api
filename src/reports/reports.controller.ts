import { Controller, Get } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('fetch')
  async fetchAndProcessReports() {
    // Update this line to call the correct method
    await this.reportsService.fetchAndStoreReport('GET_VENDOR_REAL_TIME_TRAFFIC_REPORT');
    return { message: 'Reports are being processed' };
  }
}
