import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  HostListener,
  OnInit,
  ViewChild,
} from '@angular/core';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { OwnerTableItem } from '../../interfaces/owners-table.interface';
import { TablesService } from '../../services/tables.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-owners',
  standalone: false,
  templateUrl: './owners.component.html',
  styleUrl: './owners.component.css',
})
export class OwnersComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  readonly ROW_HEIGHT = 56;
  readonly FIXED_SPACE_VERTICAL = 499.5;

  displayedColumns: string[] = [
    'id',
    'name',
    'phone',
    'email',
    'admon_value',
    'prices_list',
    'payment_plan',
    'status',
  ];
  dataSource = new MatTableDataSource<OwnerTableItem>([]);

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
    const cached = this.tablesService.getOwnersCache();
    if (cached) {
      this.currentFilterValue = cached.search;
      this.pageNumber = cached.page;
      this.pageSize = cached.size;
    }
    this.calculateDynamicPageSize(false);
    this.loadOwners();
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
        if (triggerLoad) this.loadOwners();
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
      if (triggerLoad) this.loadOwners();
    }
  }

  ngAfterViewInit() {
    if (this.paginator) {
      this.paginator.pageIndex = this.pageNumber - 1;
    }
  }

  loadOwners(forceRefresh = false) {
    const isCached = this.tablesService.hasValidOwnersCache(
      this.pageNumber,
      this.pageSize,
      this.currentFilterValue,
    );

    if (!isCached) {
      this.isLoading = true;
    }

    this.tablesService
      .getOwners(this.pageNumber, this.pageSize, this.currentFilterValue, forceRefresh)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (res) => {
          this.dataSource.data = res.owners || [];
          this.totalItems = res.total_items || 0;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error loading owners', err);
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
    this.loadOwners();
  }

  onPageChange(event: PageEvent) {
    this.pageSize = event.pageSize;
    this.pageNumber = event.pageIndex + 1; // Backend pagination is 1-indexed
    this.loadOwners();
  }
}
