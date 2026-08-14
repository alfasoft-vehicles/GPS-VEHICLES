import { ChangeDetectorRef, Component, Inject, OnInit, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { TablesService } from '../../services/tables.service';
import { OwnerBasicInfoResponse } from '../../interfaces/owners-table.interface';
import { Vehicle } from '../../interfaces/vehicles-table.interface';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-owner-details-dialog',
  standalone: false,
  templateUrl: './owner-details-dialog.component.html',
  styleUrl: './owner-details-dialog.component.css',
})
export class OwnerDetailsDialogComponent implements OnInit {
  ownerData = signal<OwnerBasicInfoResponse | null>(null);
  isLoading = signal<boolean>(true);

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

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { ownerId: string; ownerName?: string },
    private tablesService: TablesService,
    private dialogRef: MatDialogRef<OwnerDetailsDialogComponent>,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadOwnerDetails();
  }

  loadOwnerDetails(): void {
    this.isLoading.set(true);
    this.tablesService
      .getOwnerBasicInfo(this.data.ownerId)
      .pipe(
        finalize(() => {
          this.isLoading.set(false);
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (res) => {
          this.ownerData.set(res);
          this.dataSource.data = res.vehicles || [];
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error loading owner basic info:', err);
          this.cdr.detectChanges();
        },
      });
  }

  closeDialog(): void {
    this.dialogRef.close();
  }
}
