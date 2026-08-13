import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
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
  pageNumber = 1;
  currentFilterValue = '';
  isLoading = false;

  constructor(
    private tablesService: TablesService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadVehicles();
  }

  ngAfterViewInit() {
    // Paginator is initialized, we handle page changes via (page) event in HTML
  }

  loadVehicles() {
    this.isLoading = true;
    this.tablesService
      .getVehicles(this.pageNumber, this.pageSize, this.currentFilterValue)
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
