import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  HostListener,
  OnInit,
  viewChild,
  ViewChild,
} from '@angular/core';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { Vehicle } from '../../interfaces/vehicles-table.interface';
import { TablesService } from '../../services/tables.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-vehicles',
  standalone: false,
  templateUrl: './vehicles.component.html',
  styleUrl: './vehicles.component.css',
})
export class VehiclesComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  readonly ROW_HEIGHT = 56;
  readonly FIXED_SPACE_VERTICAL = 499.5;

  displayedColumns: string[] = [
    'id',
    'plate',
    'owner_name',
    'type_name',
    'status_name',
    'payment_plan',
    'cuoadmon',
    'installation_method',
    'gps_status',
    'gps_serial',
    'cel_serial',
    'cel_num',
  ];
  dataSource = new MatTableDataSource<Vehicle>([]);

  totalItems = 0;
  pageSize = 10;
  pageSizeOptions: number[] = [5, 10, 20, 50];
  pageNumber = 1;
  currentFilterValue = '';
  isLoading = false;

  constructor(
    private tablesService: TablesService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const cached = this.tablesService.getVehiclesCache();
    if (cached) {
      this.currentFilterValue = cached.search;
      this.pageNumber = cached.page;
      this.pageSize = cached.size;
    }
    this.calculateDynamicPageSize(false);
    this.loadVehicles();
  }

  @HostListener('window:resize')
  onResize() {
    this.calculateDynamicPageSize();
  }

  calculateDynamicPageSize(triggerLoad = true) {
    const isMobile = window.innerWidth < 768;

    if (isMobile) {
      this.pageSizeOptions = [5, 10, 20, 50];
      if (this.pageSize !== 10) {
        this.pageSize = 10;
        if (triggerLoad) this.loadVehicles();
      }
      return;
    }

    const windowHeight = window.innerHeight;
    const availableHeight = windowHeight - this.FIXED_SPACE_VERTICAL;
    const rowsThatFit = Math.max(1, Math.floor(availableHeight / this.ROW_HEIGHT));

    const currentOptions = new Set([rowsThatFit, 5, 10, 20, 50]);
    this.pageSizeOptions = [...currentOptions].sort((a, b) => a - b);

    if (this.pageSize !== rowsThatFit) {
      this.pageSize = rowsThatFit;
      if (triggerLoad) this.loadVehicles();
    }
  }

  ngAfterViewInit() {
    if (this.paginator) {
      this.paginator.pageIndex = this.pageNumber - 1;
    }
  }

  loadVehicles(forceRefresh = false) {
    const isCached = this.tablesService.hasValidVehiclesCache(
      this.pageNumber,
      this.pageSize,
      this.currentFilterValue,
    );

    if (!isCached) {
      this.isLoading = true;
    }

    this.tablesService
      .getVehicles(this.pageNumber, this.pageSize, this.currentFilterValue, forceRefresh)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (res) => {
          this.dataSource.data = res.items || [];
          this.totalItems = res.total_items || 0;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error loading vehicles', err);
          this.cdr.detectChanges();
        },
      });
  }

  applyFilter(filterValue: string) {
    this.currentFilterValue = filterValue.trim();
    this.pageNumber = 1; // Reset to first page on search
    if (this.paginator) {
      this.paginator.pageIndex = 0;
    }
    this.loadVehicles();
  }

  onPageChange(event: PageEvent) {
    this.pageSize = event.pageSize;
    this.pageNumber = event.pageIndex + 1; // Backend pagination is 1-indexed
    this.loadVehicles();
  }

  openVehicleDialog() {
    // To be implemented
  }
}
