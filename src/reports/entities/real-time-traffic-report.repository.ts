import { EntityRepository, Repository } from 'typeorm';
import { RealTimeTrafficReport } from '../entities/vendor-realtime-traffic.entity';
 

@EntityRepository(RealTimeTrafficReport)
export class RealTimeTrafficReportRepository extends Repository<RealTimeTrafficReport> {
  // You can add custom methods for querying the database here if needed
}
