import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { VehiclesResponse } from '../interfaces/vehicles-table.interface';

@Injectable({
  providedIn: 'root',
})
export class TablesService {
  private apiService = inject(ApiService);

  getVehicles(page: number, size: number, search: string = ''): Observable<VehiclesResponse> {
    return this.apiService.get<VehiclesResponse>(
      `/vehicles/all?page_number=${page}&page_size=${size}&search=${search}`,
    );
  }

  getTableData<T>(
    endpoint: string,
    page: number,
    size: number,
    search: string = '',
  ): Observable<T> {
    return this.apiService.get<T>(
      `/${endpoint}?page_number=${page}&page_size=${size}&search=${search}`,
    );
  }
}
