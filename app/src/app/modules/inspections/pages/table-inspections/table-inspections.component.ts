import {
  Component,
  effect,
  HostListener,
  signal,
  viewChild,
  inject,
  OnInit,
  computed,
} from '@angular/core';
import { Inspection } from '../../interfaces/inspections.interface';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { DialogNewInspectionComponent } from '../../dialogs/dialog-new-inspection/dialog-new-inspection.component';
import { PhotoGalleryDialogComponent } from '../../dialogs/photo-gallery-dialog/photo-gallery-dialog.component';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { ApiService } from '../../../../core/services/api.service';
import { Owner } from '../../interfaces/owners.interface';
import { FormControl, FormGroup } from '@angular/forms';
import { combineLatest, map, Observable, startWith, finalize } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';

import { Vehicle } from '../../interfaces/vehicles.interface';

import { MatOptionSelectionChange } from '@angular/material/core';

import { DetailsDialogComponent } from '../../dialogs/details-dialog/details-dialog.component';

@Component({
  selector: 'app-table-inspections',
  standalone: false,
  templateUrl: './table-inspections.component.html',
  styleUrl: './table-inspections.component.css',
})
export class TableInspectionsComponent implements OnInit {
  readonly paginator = viewChild(MatPaginator);
  readonly sort = viewChild(MatSort);
  readonly dialog = inject(MatDialog);
  readonly breakpointObserver = inject(BreakpointObserver);
  private apiService = inject(ApiService);

  pageSizeOptions = signal<number[]>([10, 20, 50]);
  isLoading = signal<boolean>(false);
  isInitialLoading = signal<boolean>(true);
  isGeneratingReport = signal<boolean>(false);
  loadingTitle = signal<string>('Cargando Sistema');
  loadingMessage = signal<string>(
    'Estamos preparando la información de las inspecciones. Por favor, espera un momento.',
  );

  displayedColumns: string[] = [
    'date',
    'inspection_type',
    'details',
    'plate',
    'owner',
    'user',
    'status',
    'actions',
  ];

  dataSource = new MatTableDataSource<Inspection>([]);

  readonly ROW_HEIGHT = 56;
  readonly HEADER_HEIGHT = 48;
  readonly FIXED_SPACE_VERTICAL = 465;

  // Autocomplete Clientes
  ownerControl = new FormControl('');
  owners = signal<Owner[]>([]);
  private owners$ = toObservable(this.owners);
  selectedOwnerId: string | null = null;

  filteredOwners: Observable<Owner[]> = combineLatest([
    this.owners$,
    this.ownerControl.valueChanges.pipe(startWith('')),
  ]).pipe(
    map(([owners, filterValue]) => {
      const filterStr = (filterValue || '').toLowerCase();
      return owners.filter((owner) => (owner.name || '').toLowerCase().includes(filterStr));
    }),
  );

  // Autocomplete Vehículos
  vehicleControl = new FormControl('');
  vehicles = signal<Vehicle[]>([]);
  private vehicles$ = toObservable(this.vehicles);
  selectedVehicleId: string | null = null;

  filteredVehicles: Observable<Vehicle[]> = combineLatest([
    this.vehicles$,
    this.vehicleControl.valueChanges.pipe(startWith('')),
  ]).pipe(
    map(([vehicles, filterValue]) => {
      const filterStr = (filterValue || '').toLowerCase();
      return vehicles.filter(
        (v) =>
          (v.plate || '').toLowerCase().includes(filterStr) ||
          (v.brand || '').toLowerCase().includes(filterStr) ||
          (v.id || '').toLowerCase().includes(filterStr),
      );
    }),
  );

  // Rango de Fechas
  range = new FormGroup({
    start: new FormControl<Date | null>(null),
    end: new FormControl<Date | null>(null),
  });

  constructor() {
    effect(() => {
      if (this.paginator()) {
        this.dataSource.paginator = this.paginator()!;
        this.calculateDynamicPageSize();
      }
      if (this.sort()) {
        this.dataSource.sort = this.sort()!;
      }
    });
  }

  ngOnInit(): void {
    this.loadOwners();
    this.loadVehicles();
    this.loadInspections({
      owner: '',
      vehicle_id: '',
      initial_date: '',
      final_date: '',
    });
  }

  private loadOwners(): void {
    this.apiService.get<Owner[]>('/owners').subscribe({
      next: (data) => {
        this.owners.set(data || []);
      },
      error: (error) => {
        console.error('Error loading owners:', error);
      },
    });
  }

  onOwnerSelected(event: MatOptionSelectionChange, owner: Owner): void {
    if (event.isUserInput) {
      this.selectedOwnerId = owner.id.toString();
      this.vehicleControl.setValue('');
      this.selectedVehicleId = null;
      this.loadVehicles(this.selectedOwnerId);
    }
  }

  onOwnerCleared(): void {
    if (!this.ownerControl.value || this.ownerControl.value.trim() === '') {
      this.selectedOwnerId = null;
      this.loadVehicles();
    }
  }

  private loadVehicles(ownerId: string | null = null): void {
    const endpoint = `/vehicles/vehicles-per-owner${ownerId ? `/?owner_id=${ownerId}` : ''}`;
    this.apiService.post<Vehicle[]>(endpoint, {}).subscribe({
      next: (data) => {
        this.vehicles.set(data || []);
      },
      error: (error) => {
        console.error('Error loading vehicles:', error);
        this.vehicles.set([]);
      },
    });
  }

  onVehicleSelected(event: MatOptionSelectionChange, vehicle: Vehicle): void {
    if (event.isUserInput) {
      this.selectedVehicleId = vehicle.id;
    }
  }

  loadInspections(filters: any = {}): void {
    const isInitial = this.isInitialLoading();
    if (!isInitial) {
      this.isLoading.set(true);
    }
    this.apiService
      .post<Inspection[]>('/inspections/list', filters)
      .pipe(
        finalize(() => {
          this.isLoading.set(false);
          this.isInitialLoading.set(false);
        }),
      )
      .subscribe({
        next: (data) => {
          this.dataSource.data = data || [];
        },
        error: (error) => {
          console.error('Error loading inspections:', error);
          this.dataSource.data = [];
        },
      });
  }

  @HostListener('window:resize')
  onResize() {
    this.calculateDynamicPageSize();
  }

  calculateDynamicPageSize() {
    const isMobile = window.innerWidth < 768;

    if (isMobile) {
      this.pageSizeOptions.set([10, 20, 50]);
      if (this.paginator()) {
        this.paginator()!.pageSize = 10;
        this.dataSource.paginator = this.paginator()!;
      }
      return;
    }

    const windowHeight = window.innerHeight;
    const availableHeight = windowHeight - this.FIXED_SPACE_VERTICAL;

    const rowsThatFit = Math.max(1, Math.floor(availableHeight / this.ROW_HEIGHT));

    if (this.paginator()) {
      const currentOptions = new Set([rowsThatFit, 10, 20, 50]);
      this.pageSizeOptions.set([...currentOptions].sort((a, b) => a - b));

      this.paginator()!.pageSize = rowsThatFit;
      this.dataSource.paginator = this.paginator()!;
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'FIN':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'PEN':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'SUS':
        return 'bg-rose-100 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'PEN':
        return 'Pendiente';
      case 'FIN':
        return 'Finalizada';
      case 'SUS':
        return 'Suspendida';
      default:
        return status;
    }
  }

  getRowClass(status: string): string {
    switch (status) {
      case 'PEN':
        return 'bg-amber-50/60 hover:bg-amber-100/50';
      case 'SUS':
        return 'bg-rose-50/60 hover:bg-rose-100/50';
      default:
        return 'hover:bg-slate-50 transition-colors';
    }
  }

  search() {
    const filters: any = {
      owner: this.selectedOwnerId || '',
      vehicle_id: this.selectedVehicleId || '',
      initial_date: '',
      final_date: '',
    };

    if (this.range.value.start) {
      filters.initial_date = this.range.value.start.toISOString().split('T')[0];
    }
    if (this.range.value.end) {
      filters.final_date = this.range.value.end.toISOString().split('T')[0];
    }

    this.loadInspections(filters);
  }

  openOptions() {
    console.log('Opciones...');
  }

  newInspection() {
    const isXSmall = this.breakpointObserver.isMatched(Breakpoints.XSmall);
    const isSmall = this.breakpointObserver.isMatched(Breakpoints.Small);
    const dialogWidth = isXSmall ? '100vw' : isSmall ? '95vw' : '1050px';

    const dialogRef = this.dialog.open(DialogNewInspectionComponent, {
      width: dialogWidth,
      maxWidth: isXSmall ? '100vw' : '95vw',
      panelClass: 'custom-dialog-container',
      disableClose: true,
      data: null,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.reloadTable();
      }
    });
  }

  editInspection(row: Inspection) {
    const isXSmall = this.breakpointObserver.isMatched(Breakpoints.XSmall);
    const isSmall = this.breakpointObserver.isMatched(Breakpoints.Small);
    const dialogWidth = isXSmall ? '100vw' : isSmall ? '95vw' : '1050px';

    const dialogRef = this.dialog.open(DialogNewInspectionComponent, {
      width: dialogWidth,
      maxWidth: isXSmall ? '100vw' : '95vw',
      panelClass: 'custom-dialog-container',
      disableClose: true,
      data: { inspectionId: row.id },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.reloadTable();
      }
    });
  }

  private reloadTable() {
    this.loadingTitle.set('Cargando Sistema');
    this.loadingMessage.set(
      'Estamos preparando la información de las inspecciones. Por favor, espera un momento.',
    );
    // Reiniciamos el componente
    this.isInitialLoading.set(true);

    // Limpiamos controles de filtros
    this.ownerControl.setValue('');
    this.vehicleControl.setValue('');
    this.range.reset();

    // Limpiamos IDs seleccionados
    this.selectedOwnerId = null;
    this.selectedVehicleId = null;

    // Recargamos datos sin filtros
    this.loadInspections({
      owner: '',
      vehicle_id: '',
      initial_date: '',
      final_date: '',
    });
  }

  viewPhotos(row: Inspection) {
    this.dialog.open(PhotoGalleryDialogComponent, {
      width: '800px',
      maxWidth: '95vw',
      panelClass: 'custom-dialog-container',
      data: {
        photos: row.photos,
        canDelete: false,
      },
    });
  }

  viewDetails(row: Inspection) {
    const isXSmall = this.breakpointObserver.isMatched(Breakpoints.XSmall);
    const isSmall = this.breakpointObserver.isMatched(Breakpoints.Small);
    const dialogWidth = isXSmall ? '100vw' : isSmall ? '95vw' : '900px';

    const dialogRef = this.dialog.open(DetailsDialogComponent, {
      width: dialogWidth,
      maxWidth: isXSmall ? '100vw' : '95vw',
      maxHeight: '95vh',
      panelClass: 'custom-dialog-container',
      data: {
        id: row.id,
        photos: row.photos,
        signature: row.signature,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result === 'edit') {
        this.editInspection(row);
      }
    });
  }

  generateInspectionReport(row: Inspection) {
    const pdfWindow = window.open('about:blank', '_blank');

    this.loadingTitle.set('Generando Reporte');
    this.loadingMessage.set(
      'Estamos procesando el documento PDF de la inspección. Por favor, espera un momento.',
    );
    this.isGeneratingReport.set(true);

    this.apiService
      .get<{ inspection_pdf: string }>(`/inspections/generate-pdf/${row.id}`)
      .pipe(
        finalize(() => {
          this.isGeneratingReport.set(false);
        }),
      )
      .subscribe({
        next: (res) => {
          if (res && res.inspection_pdf) {
            if (pdfWindow) {
              pdfWindow.location.href = res.inspection_pdf;
            } else {
              window.location.href = res.inspection_pdf;
            }
          } else {
            pdfWindow?.close();
          }
        },
        error: (error) => {
          pdfWindow?.close();
          console.error('Error generating report:', error);
        },
      });
  }

  generateGeneralReport() {
    const filters: any = {
      owner: this.selectedOwnerId || '',
      vehicle_id: this.selectedVehicleId || '',
      initial_date: '',
      final_date: '',
    };

    if (this.range.value.start) {
      filters.initial_date = this.range.value.start.toISOString().split('T')[0];
    }
    if (this.range.value.end) {
      filters.final_date = this.range.value.end.toISOString().split('T')[0];
    }

    const pdfWindow = window.open('about:blank', '_blank');

    this.loadingTitle.set('Generando Reporte General');
    this.loadingMessage.set(
      'Estamos procesando el reporte general de inspecciones. Por favor, espera un momento.',
    );
    this.isGeneratingReport.set(true);

    this.apiService
      .post<{ inspection_pdf: string }>('/inspections/generate-general-pdf', filters)
      .pipe(
        finalize(() => {
          this.isGeneratingReport.set(false);
        }),
      )
      .subscribe({
        next: (res) => {
          if (res && res.inspection_pdf) {
            if (pdfWindow) {
              pdfWindow.location.href = res.inspection_pdf;
            } else {
              window.location.href = res.inspection_pdf;
            }
          } else {
            pdfWindow?.close();
          }
        },
        error: (error) => {
          pdfWindow?.close();
          console.error('Error generating general report:', error);
        },
      });
  }
}
