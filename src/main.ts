import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ReportsService } from './reports/reports.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const reportsService = app.get(ReportsService);

  // Call the method to test the report fetching logic on startup
  console.log('Starting report fetch process...');
  await reportsService.fetchAndStoreReport('GET_VENDOR_REAL_TIME_TRAFFIC_REPORT');
  console.log('Report fetch process finished.');

  await app.listen(3000);
}
bootstrap();
