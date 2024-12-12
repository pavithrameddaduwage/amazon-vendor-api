import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AuthService } from '../auth.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RealTimeTrafficReport } from './entities/vendor-realtime-traffic.entity';
import * as zlib from 'zlib';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ReportsService {
  private currentAccessToken: string | null = null;
  private tokenExpirationTime: number | null = null;
  private readonly baseUrl = 'https://sellingpartnerapi-na.amazon.com';

  constructor(
    private readonly httpService: HttpService,
    private readonly authService: AuthService,
    @InjectRepository(RealTimeTrafficReport)
    private readonly realTimeTrafficReportRepository: Repository<RealTimeTrafficReport>,
  ) {
    this.checkDatabaseConnection();
  }

  // Check database connection on initialization
  private async checkDatabaseConnection() {
    try {
      const result = await this.realTimeTrafficReportRepository.query('SELECT 1');
      if (result) {
        console.log('Database connection verified successfully.');
      } else {
        console.warn('Database connection test returned no result.');
      }
    } catch (error) {
      console.error('Database connection failed:', error.message);
    }
  }

  // Ensure valid access token
  private async ensureAccessToken() {
    if (!this.currentAccessToken || new Date().getTime() >= this.tokenExpirationTime) {
      try {
        const { access_token, expirationTime } = await this.authService.getAccessToken();
        this.currentAccessToken = access_token;
        this.tokenExpirationTime = expirationTime;
      } catch (error) {
        throw new Error('Failed to retrieve access token: ' + error.message);
      }
    }
  }

  // Fetch URL with retry mechanism
  private async fetchWithRetry(url: string, options: any, retries = 5, delay = 1000) {
    while (retries > 0) {
      try {
        const response = await firstValueFrom(this.httpService.get(url, options));
        return response.data;
      } catch (error) {
        if (error.response && error.response.status === 429 && retries > 0) {
          const retryAfter = (error.response.headers['x-amzn-RateLimit-Reset'] || 1) * 1000 - Date.now();
          retries--;
          await new Promise(resolve => setTimeout(resolve, Math.max(retryAfter, delay)));
          delay *= 2; // Increment delay for next retry
        } else {
          throw new Error(`Error fetching URL ${url}: ${error.message}`);
        }
      }
    }
    throw new Error('Max retries reached for URL: ' + url);
  }

  // Fetch report document details
  private async fetchReportDocumentDetails(reportDocumentId: string) {
    const url = `${this.baseUrl}/reports/2021-06-30/documents/${reportDocumentId}`;
    const response = await this.fetchWithRetry(url, {
      headers: {
        Authorization: `Bearer ${this.currentAccessToken}`,
        'x-amz-access-token': this.currentAccessToken,
        'Content-Type': 'application/json',
      },
    });
    if (!response.url) {
      throw new Error(`URL for report document ${reportDocumentId} is missing.`);
    }
    return {
      url: response.url,
      compressionAlgorithm: response.compressionAlgorithm || 'GZIP',
    };
  }

  // Fetch and decompress the report document
  private async fetchAndDecompressReportDocument(reportUrl: string, compressionAlgorithm: string) {
    const response = await firstValueFrom(
      this.httpService.get(reportUrl, { responseType: 'arraybuffer' }),
    );
    console.log('Fetched report document (raw):', response.data);

    if (!response.data || response.data.length === 0) {
      console.error('Fetched document is empty.');
      throw new Error('Fetched report document is empty.');
    }

    if (compressionAlgorithm === 'GZIP') {
      return new Promise<string>((resolve, reject) => {
        zlib.gunzip(response.data, (err, decoded) => {
          if (err) {
            console.error('Error decompressing report:', err);
            reject(err);
          } else {
            const decodedString = decoded.toString();
            console.log('Decompressed report document content:', decodedString);
            resolve(decodedString);
          }
        });
      });
    } else {
      console.error(`Unsupported compression algorithm: ${compressionAlgorithm}`);
      throw new Error(`Unsupported compression algorithm: ${compressionAlgorithm}`);
    }
  }

  // Map raw data to entity (with handling for missing or null values)
  private mapData(reportType: string, rawData: any[]) {
    console.log('Mapping data for report type:', reportType);
    console.log('Raw data to map:', rawData);

    if (!rawData || !Array.isArray(rawData)) return [];

    return rawData.map(data => {
      return this.realTimeTrafficReportRepository.create({
        startTime: data.startTime ? new Date(data.startTime) : new Date(),
        endTime: data.endTime ? new Date(data.endTime) : new Date(),
        asin: data.asin || 'UNKNOWN',
        glanceViews: data.glanceViews !== undefined ? data.glanceViews : 0,
      });
    });
  }

  // Helper function to get the start and end date for the week starting from a given date
  private getWeekStartEndDates(startDate: Date): { startDate: Date, endDate: Date } {
    const startOfWeek = new Date(startDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Set to Sunday of that week

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Week ends on Saturday

    return { startDate: startOfWeek, endDate: endOfWeek };
  }

  // Fetch reports for a specific week
  private async fetchReportsForWeek(reportType: string, startDate: Date) {
    await this.ensureAccessToken();
    let pageSize = 50;  // Default page size
    let nextPageToken: string | null = null;  // For pagination
    let allReports = [];  // To store all reports

    const { startDate: weekStart, endDate: weekEnd } = this.getWeekStartEndDates(startDate);
    const formattedStartDate = weekStart.toISOString().split('T')[0];
    const formattedEndDate = weekEnd.toISOString().split('T')[0];

    // Log the week date range
    console.log(`Fetching reports for the week: ${formattedStartDate} to ${formattedEndDate}`);

    do {
      let url = `${this.baseUrl}/reports/2021-06-30/reports?reportTypes=${reportType}&processingStatuses=DONE&marketplaceIds=ATVPDKIKX0DER&pageSize=${pageSize}&startDate=${formattedStartDate}&endDate=${formattedEndDate}`;

      // Add pagination token if it exists
      if (nextPageToken) {
        url += `&nextPageToken=${nextPageToken}`;
      }

      try {
        const response = await this.fetchWithRetry(url, {
          headers: {
            Authorization: `Bearer ${this.currentAccessToken}`,
            'x-amz-access-token': this.currentAccessToken,
            'Content-Type': 'application/json',
          },
        });

        console.log('Fetched reports:', response.reports);

        // Add the fetched reports to the allReports array
        allReports = allReports.concat(response.reports);

        // Check if there's a next page and update the pagination token
        nextPageToken = response.nextPageToken || null;

      } catch (error) {
        console.error('Error fetching reports:', error.message);
        break; // Exit the loop in case of an error
      }

    } while (nextPageToken);  // Continue fetching until no nextPageToken is present

    // Log the total number of reports fetched
    console.log(`Total reports fetched for the week ${formattedStartDate} to ${formattedEndDate}: ${allReports.length}`);

    // Process the reports once all pages are fetched
    for (const report of allReports || []) {
      try {
        const { url: reportUrl, compressionAlgorithm } = await this.fetchReportDocumentDetails(report.reportDocumentId);
        console.log(`Fetching document details for report ${report.reportDocumentId} from URL: ${reportUrl}`);

        const reportDocument = await this.fetchAndDecompressReportDocument(reportUrl, compressionAlgorithm);
        const parsedData = JSON.parse(reportDocument);
        console.log('Parsed data:', parsedData);

        if (parsedData && parsedData.reportData) {
          const mappedData = this.mapData(reportType, parsedData.reportData);
          console.log('Mapped data:', mappedData);

          if (mappedData.length) {
            await this.realTimeTrafficReportRepository.save(mappedData);
            console.log(`Successfully inserted ${mappedData.length} records.`);
          } else {
            console.log('No valid data found to insert.');
          }
        } else {
          console.error('Parsed data is empty or missing the "reportData" field.');
        }
      } catch (error) {
        console.error(`Failed to process report ${report.reportDocumentId}:`, error.message);
      }
    }
  }

  // Public method to fetch and store reports
  public async fetchAndStoreReport(reportType: string) {
    try {
      const startDate = new Date('2024-11-01'); // Start from November 1, 2024
      await this.fetchReportsForWeek(reportType, startDate);
      console.log(`Reports fetched and stored successfully for type: ${reportType}`);
    } catch (error) {
      console.error(`Error during report fetch process: ${error.message}`);
    }
  }
}
