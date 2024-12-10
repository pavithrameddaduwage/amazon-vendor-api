import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('amazon_real_time_traffic_report')
export class RealTimeTrafficReport {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'start_time', type: 'timestamp' })
  startTime: Date;

  @Column({ name: 'end_time', type: 'timestamp' })
  endTime: Date;

  @Column({ name: 'asin' })
  asin: string;

  @Column({ type: 'int', name: 'glance_views' })
  glanceViews: number;
}
