import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  HostListener,
  OnInit,
  ViewChild,
} from '@angular/core';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { ELEMENT_DATA } from '../../consts/groups-data';

@Component({
  selector: 'app-example-tab',
  standalone: false,
  templateUrl: './example-tab.component.html',
  styleUrl: './example-tab.component.css',
})
export class ExampleTabComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Constantes de altura para cálculo dinámico del tamaño de página
  readonly ROW_HEIGHT = 56;
  readonly FIXED_SPACE_VERTICAL = 499.5;

  displayedColumns: string[] = ['id', 'name', 'createdBy', 'createdAt'];
  dataSource = new MatTableDataSource(ELEMENT_DATA);

  totalItems = ELEMENT_DATA.length;
  pageSize = 10;
  pageSizeOptions: number[] = [5, 10, 20, 50];
  pageNumber = 1;
  currentFilterValue = '';
  isLoading = false;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.calculateDynamicPageSize(false);
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  @HostListener('window:resize')
  onResize(): void {
    this.calculateDynamicPageSize();
  }

  calculateDynamicPageSize(triggerLoad = true): void {
    const isMobile = window.innerWidth < 768;

    if (isMobile) {
      this.pageSizeOptions = [5, 10, 20, 50];
      if (this.pageSize !== 10) {
        this.pageSize = 10;
        if (this.paginator) {
          this.paginator.pageSize = 10;
        }
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
      if (this.paginator) {
        this.paginator.pageSize = rowsThatFit;
      }
    }
  }

  applyFilter(filterValue: string): void {
    this.currentFilterValue = filterValue.trim();
    this.dataSource.filter = filterValue.trim().toLowerCase();
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.pageNumber = event.pageIndex + 1;
  }
}
