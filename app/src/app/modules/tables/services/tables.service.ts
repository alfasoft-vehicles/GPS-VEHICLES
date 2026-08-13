import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { VehiclesResponse } from '../interfaces/vehicles-table.interface';
import { OwnersResponse } from '../interfaces/owners-table.interface';
import { InventoryResponse } from '../interfaces/inventory-table.interface';

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

  getOwners(page: number, size: number, search: string = ''): Observable<OwnersResponse> {
    return this.apiService.get<OwnersResponse>(
      `/owners/all?page_number=${page}&page_size=${size}&search=${search}`,
    );
  }

  getInventory(page: number, size: number, search: string = ''): Observable<InventoryResponse> {
    return this.apiService.get<InventoryResponse>(
      `/inventory/?page_number=${page}&page_size=${size}&search=${search}`,
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
