import { Controller, Get, Param } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get(':reportType')
  async getReport(@Param('reportType') reportType: string) {
    console.log(`Received request for report type: ${reportType}`);
    await this.reportsService.fetchAndStoreReport(reportType);
    return { message: 'Report processing started' };
  }
}
