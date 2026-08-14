import { inject, Injectable } from '@angular/core';
import { Observable, of, tap } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { VehiclesResponse } from '../interfaces/vehicles-table.interface';
import { OwnersResponse } from '../interfaces/owners-table.interface';
import { InventoryResponse } from '../interfaces/inventory-table.interface';
import { TableCache } from '../interfaces/cache.interface';

@Injectable({
  providedIn: 'root',
})
export class TablesService {
  private apiService = inject(ApiService);

  private vehiclesCache: TableCache<VehiclesResponse> | null = null;
  private ownersCache: TableCache<OwnersResponse> | null = null;
  private inventoryCache: TableCache<InventoryResponse> | null = null;

  hasValidVehiclesCache(page: number, size: number, search: string = ''): boolean {
    return !!(
      this.vehiclesCache &&
      this.vehiclesCache.page === page &&
      this.vehiclesCache.size === size &&
      this.vehiclesCache.search === search
    );
  }

  getVehicles(
    page: number,
    size: number,
    search: string = '',
    forceRefresh: boolean = false,
  ): Observable<VehiclesResponse> {
    if (!forceRefresh && this.hasValidVehiclesCache(page, size, search)) {
      return of(this.vehiclesCache!.data);
    }

    return this.apiService
      .get<VehiclesResponse>(`/vehicles/all?page_number=${page}&page_size=${size}&search=${search}`)
      .pipe(
        tap((res) => {
          this.vehiclesCache = { page, size, search, data: res };
        }),
      );
  }

  hasValidOwnersCache(page: number, size: number, search: string = ''): boolean {
    return !!(
      this.ownersCache &&
      this.ownersCache.page === page &&
      this.ownersCache.size === size &&
      this.ownersCache.search === search
    );
  }

  getOwners(
    page: number,
    size: number,
    search: string = '',
    forceRefresh: boolean = false,
  ): Observable<OwnersResponse> {
    if (!forceRefresh && this.hasValidOwnersCache(page, size, search)) {
      return of(this.ownersCache!.data);
    }

    return this.apiService
      .get<OwnersResponse>(`/owners/all?page_number=${page}&page_size=${size}&search=${search}`)
      .pipe(
        tap((res) => {
          this.ownersCache = { page, size, search, data: res };
        }),
      );
  }

  hasValidInventoryCache(page: number, size: number, search: string = ''): boolean {
    return !!(
      this.inventoryCache &&
      this.inventoryCache.page === page &&
      this.inventoryCache.size === size &&
      this.inventoryCache.search === search
    );
  }

  getInventory(
    page: number,
    size: number,
    search: string = '',
    forceRefresh: boolean = false,
  ): Observable<InventoryResponse> {
    if (!forceRefresh && this.hasValidInventoryCache(page, size, search)) {
      return of(this.inventoryCache!.data);
    }

    return this.apiService
      .get<InventoryResponse>(`/inventory/?page_number=${page}&page_size=${size}&search=${search}`)
      .pipe(
        tap((res) => {
          this.inventoryCache = { page, size, search, data: res };
        }),
      );
  }

  getVehiclesCache(): TableCache<VehiclesResponse> | null {
    return this.vehiclesCache;
  }

  getOwnersCache(): TableCache<OwnersResponse> | null {
    return this.ownersCache;
  }

  getInventoryCache(): TableCache<InventoryResponse> | null {
    return this.inventoryCache;
  }

  clearCache(table?: 'vehicles' | 'owners' | 'inventory') {
    if (!table) {
      this.vehiclesCache = null;
      this.ownersCache = null;
      this.inventoryCache = null;
      return;
    }
    if (table === 'vehicles') this.vehiclesCache = null;
    if (table === 'owners') this.ownersCache = null;
    if (table === 'inventory') this.inventoryCache = null;
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
