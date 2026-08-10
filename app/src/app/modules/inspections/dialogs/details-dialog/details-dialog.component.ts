import { Component, Inject, OnInit, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { ApiService } from '../../../../core/services/api.service';
import { finalize } from 'rxjs';
import { PhotoGalleryDialogComponent } from '../photo-gallery-dialog/photo-gallery-dialog.component';
import { PhotoPreviewDialogComponent } from '../photo-preview-dialog/photo-preview-dialog.component';

interface InspectionDetails {
  id: number;
  date: string;
  time: string;
  owner: string;
  owner_name: string;
  inspection_type: string;
  vehicle_id: string;
  plate: string;
  vehicle_status: string;
  gps_brand?: string;
  gps_brand_id?: string;
  gps_serial: string;
  celular_number: string;
  celular_serial: string;
  installation_way: string;
  description: string;
  notes: string;
  status: string;
  user: string;
  photos: string[];
  signature: number;
}

@Component({
  selector: 'app-details-dialog',
  standalone: false,
  templateUrl: './details-dialog.component.html',
  styleUrl: './details-dialog.component.css',
})
export class DetailsDialogComponent implements OnInit {
  inspectionData = signal<InspectionDetails | null>(null);
  isLoading = signal<boolean>(true);

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { id: number; photos: string[]; signature: string[] },
    private apiService: ApiService,
    private dialogRef: MatDialogRef<DetailsDialogComponent>,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.loadDetails();
  }

  loadDetails() {
    this.isLoading.set(true);
    this.apiService
      .get<InspectionDetails>(`/inspections/details/${this.data.id}`)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (res) => {
          this.inspectionData.set(res);
        },
        error: (err) => {
          console.error('Error loading inspection details:', err);
        },
      });
  }

  getStatusText(status: string | undefined): string {
    switch (status) {
      case 'PEN':
        return 'Pendiente';
      case 'FIN':
        return 'Finalizada';
      case 'SUS':
        return 'Suspendida';
      default:
        return status || 'N/A';
    }
  }

  getOwnerCode(owner: string | undefined): string {
    return owner || 'N/A';
  }

  closeDialog(action: string = '') {
    if (action === 'viewPhotos') {
      this.viewPhotos();
    } else if (action === 'viewSignature') {
      this.viewSignature();
    } else if (action === 'edit') {
      this.dialogRef.close('edit');
    } else {
      this.dialogRef.close();
    }
  }

  viewPhotos() {
    this.dialog.open(PhotoGalleryDialogComponent, {
      width: '800px',
      maxWidth: '95vw',
      panelClass: 'custom-dialog-container',
      data: {
        photos: this.data.photos,
        canDelete: false,
      },
    });
  }

  viewSignature() {
    if (this.data.signature && this.data.signature.length > 0 && this.data.signature[0]) {
      this.dialog.open(PhotoPreviewDialogComponent, {
        width: '600px',
        maxWidth: '95vw',
        panelClass: 'custom-dialog-container',
        data: {
          photoUrl: this.data.signature[0],
          canDelete: false,
          isSignature: true,
        },
      });
    }
  }
}
