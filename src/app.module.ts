import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';  // Import ConfigModule
import { ReportsModule } from './reports/reports.module';
import { AuthModule } from './auth.module';
import { RealTimeTrafficReport } from './reports/entities/vendor-realtime-traffic.entity';

@Module({
  imports: [
    // Import ConfigModule and load the .env file
    ConfigModule.forRoot({
      isGlobal: true, // Make the configuration globally available
    }),

    // TypeOrmModule setup with database configurations
    TypeOrmModule.forRoot({
      type: 'postgres',  // Database type
      host: process.env.DATABASE_HOST,  // Use the values from .env
      port: +process.env.DATABASE_PORT, // Ensure the port is a number
      username: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      entities: [RealTimeTrafficReport], // Make sure your entity is listed here
      synchronize: true,  // Set to false in production
    }),

    // Importing your custom modules
    ReportsModule,
    AuthModule,
  ],
})
export class AppModule {}
