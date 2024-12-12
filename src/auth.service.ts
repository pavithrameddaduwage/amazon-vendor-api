import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AuthService {
  private readonly tokenUrl = 'https://api.amazon.com/auth/o2/token';

  constructor(private readonly httpService: HttpService) {}

  async getAccessToken(): Promise<{ access_token: string; expirationTime: number }> {
    const response = await firstValueFrom(
      this.httpService.post(this.tokenUrl, {
        grant_type: 'refresh_token',
        refresh_token: process.env.REFRESH_TOKEN,
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
      }),
    );

    const expirationTime = new Date().getTime() + response.data.expires_in * 1000; // Calculate expiration time
    return { access_token: response.data.access_token, expirationTime };
  }
}
