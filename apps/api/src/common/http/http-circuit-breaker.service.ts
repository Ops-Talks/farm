import { Injectable } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { CircuitBreakerService } from "../circuit-breaker/circuit-breaker.service";
import { AxiosRequestConfig, AxiosResponse } from "axios";
import { Observable, from } from "rxjs";
import { firstValueFrom } from "rxjs";

@Injectable()
export class HttpCircuitBreakerService {
  constructor(
    private readonly httpService: HttpService,
    private readonly circuitBreaker: CircuitBreakerService,
  ) {}

  get<T = unknown>(
    integration: string,
    url: string,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<T>> {
    return from(
      this.circuitBreaker.fire(integration, () =>
        firstValueFrom(this.httpService.get<T>(url, config)),
      ),
    );
  }

  post<T = unknown>(
    integration: string,
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<T>> {
    return from(
      this.circuitBreaker.fire(integration, () =>
        firstValueFrom(this.httpService.post<T>(url, data, config)),
      ),
    );
  }

  put<T = unknown>(
    integration: string,
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<T>> {
    return from(
      this.circuitBreaker.fire(integration, () =>
        firstValueFrom(this.httpService.put<T>(url, data, config)),
      ),
    );
  }

  patch<T = unknown>(
    integration: string,
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<T>> {
    return from(
      this.circuitBreaker.fire(integration, () =>
        firstValueFrom(this.httpService.patch<T>(url, data, config)),
      ),
    );
  }

  delete<T = unknown>(
    integration: string,
    url: string,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<T>> {
    return from(
      this.circuitBreaker.fire(integration, () =>
        firstValueFrom(this.httpService.delete<T>(url, config)),
      ),
    );
  }

  get raw(): HttpService {
    return this.httpService;
  }
}
