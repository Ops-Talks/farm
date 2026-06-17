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

  get<T = any>(
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

  post<T = any>(
    integration: string,
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<T>> {
    return from(
      this.circuitBreaker.fire(integration, () =>
        firstValueFrom(this.httpService.post<T>(url, data, config)),
      ),
    );
  }

  put<T = any>(
    integration: string,
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<T>> {
    return from(
      this.circuitBreaker.fire(integration, () =>
        firstValueFrom(this.httpService.put<T>(url, data, config)),
      ),
    );
  }

  patch<T = any>(
    integration: string,
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Observable<AxiosResponse<T>> {
    return from(
      this.circuitBreaker.fire(integration, () =>
        firstValueFrom(this.httpService.patch<T>(url, data, config)),
      ),
    );
  }

  delete<T = any>(
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
