import { Injectable } from "@nestjs/common";

@Injectable()
export class AppService {
  getHealth(): { status: string; version: string } {
    return {
      status: "ok",
      version: process.env.npm_package_version ?? "0.1.0",
    };
  }
}
