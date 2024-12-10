import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RealTimeTrafficReport } from './entities/vendor-realtime-traffic.entity';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Injectable()
export class ReportsService {
  private apiUrl = 'https://sellingpartnerapi-na.amazon.com/reports/2020-09-04';

  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(RealTimeTrafficReport)
    private readonly trafficRepository: Repository<RealTimeTrafficReport>,
  ) {}

  // Simulate fetching an access token (Replace with your actual logic)
  async getAccessToken(): Promise<string> {
    console.log('Fetching access token...');
    // Log a dummy access token for demonstration
    const accessToken = 'your-access-token';  // Replace with actual token logic
    console.log('Access token:', accessToken);  // Log the access token
    return accessToken;
  }

  async fetchAndStoreReport(reportType: string): Promise<void> {
    console.log(`Processing report for reportType: ${reportType}`);  // Log the report type being processed

    const accessToken = await this.getAccessToken();
    console.log('Access token received:', accessToken);  // Log the access token

    // Step 1: Request to create a report
    const createResponse = await this.httpService
      .post(
        `${this.apiUrl}/reports`,
        { reportType },
        { headers: { Authorization: `Bearer ${accessToken}` } },
      )
      .pipe(
        catchError((error) => {
          console.error('Error creating report:', error.message);
          throw error;
        }),
      )
      .toPromise();

    const reportId = createResponse.data.reportId;
    console.log(`Created report with ID: ${reportId}`);  // Log the report ID

    // Step 2: Poll for the report status
    let status = 'IN_PROGRESS';
    while (status !== 'DONE') {
      await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10 seconds before polling again
      const statusResponse = await this.httpService
        .get(`${this.apiUrl}/reports/${reportId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        .toPromise();

      status = statusResponse.data.processingStatus;
      console.log(`Report status: ${status}`);  // Log the report processing status

      if (status !== 'DONE' && status !== 'ERROR') {
        console.log('Waiting for report to finish processing...');
      }
    }

    // Step 3: Fetch the report document once processing is done
    const documentResponse = await this.httpService
      .get(`${this.apiUrl}/documents/${createResponse.data.reportDocumentId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      .toPromise();

    console.log('Fetched report document:', documentResponse.data);  // Log the document response

    // Step 4: Parse the report data
    const reportData = JSON.parse(
      Buffer.from(documentResponse.data.document, 'base64').toString('utf-8'),
    );
    console.log('Parsed report data:', reportData);  // Log the parsed report data

    // Step 5: Save the report data to the database
    if (reportType === 'GET_VENDOR_REAL_TIME_TRAFFIC_REPORT') {
      console.log('Processing Real-Time Traffic Report...');
      for (const record of reportData) {
        try {
          console.log('Record from API:', record);  // Log each record to be saved
          
          // Create the entity for saving
          const entity = this.trafficRepository.create({
            startTime: new Date(record.startTime),
            endTime: new Date(record.endTime),
            asin: record.asin,
            glanceViews: record.glanceViews,
          });
          console.log('Entity to save:', entity);  // Log the entity before saving

          // Save the entity to the database
          await this.trafficRepository.save(entity);
          console.log(`Record saved: ${entity.asin}`);
        } catch (error) {
          console.error('Error saving record:', error.message, error);  // Log errors when saving records
        }
      }
    }
  }
}
