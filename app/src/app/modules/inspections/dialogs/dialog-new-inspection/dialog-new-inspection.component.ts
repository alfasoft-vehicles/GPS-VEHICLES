import { Component, computed, signal, inject, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Vehicle } from '../../interfaces/vehicles.interface';
import { Owner } from '../../interfaces/owners.interface';
import { ApiService } from '../../../../core/services/api.service';
import { SnackbarService } from '../../../../core/services/snackbar.service';
import { finalize, Observable, combineLatest, map, startWith } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { MatOptionSelectionChange } from '@angular/material/core';

@Component({
  selector: 'app-dialog-new-inspection',
  standalone: false,
  templateUrl: './dialog-new-inspection.component.html',
  styleUrls: ['./dialog-new-inspection.component.css'],
})
export class DialogNewInspectionComponent implements OnInit {
  private apiService = inject(ApiService);
  private snackbarService = inject(SnackbarService);
  private dialog = inject(MatDialog);

  // Lista de vehículos
  vehicles = signal<Vehicle[]>([]);
  isLoadingVehicles = signal<boolean>(true);

  // Estado de búsqueda de vehículos
  searchQuery = signal<string>('');

  // Vehículo seleccionado (null si no hay selección)
  selectedVehicle = signal<Vehicle | null>(null);

  // Vehículo no registrado
  isUnregisteredVehicle = signal<boolean>(false);
  unregisteredPlate = signal<string>('');

  // Cliente / Propietarios
  owners = signal<Owner[]>([]);
  private owners$ = toObservable(this.owners);
  selectedOwner = signal<Owner | null>(null);
  isUnregisteredOwner = signal<boolean>(false);
  unregisteredOwnerName = signal<string>('');
  ownerSearchControl = new FormControl<string>('');

  // CONTROL DEL WIZARD (Pasos)
  currentStep = signal<number>(1);

  // NUEVAS VARIABLES PARA EL TIPO DE INSPECCIÓN
  selectedInspectionType = signal<string | null>(null);
  inspectionTypes = signal<{ id: number; name: string }[]>([]);

  // Opciones para Forma de Instalación
  installationWays = signal<string[]>(['Rastreo', 'Corta Corriente', 'Bomba Gasolina', 'Ninguno']);

  // Marcas de GPS
  gpsBrands = signal<{ id: string; name: string }[]>([]);

  // Formulario de inspección (Paso 2)
  inspectionForm = new FormGroup({
    gps_brand_id: new FormControl<string>('', [Validators.required]),
    gps_serial: new FormControl<string>('', [Validators.required]),
    celular_number: new FormControl<string>('', [Validators.required]),
    celular_serial: new FormControl<string>('', [Validators.required]),
    installation_way: new FormControl<string>('', [Validators.required]),
    description: new FormControl<string>('', [Validators.required]),
    notes: new FormControl<string>(''),
  });

  // ID de la inspección creada/editada
  inspectionId = signal<number | null>(null);
  isEditing = signal<boolean>(false);
  dataSaved = signal<boolean>(false);

  // COMPUTED: Filtrado Local Ultra-Rápido de Vehículos
  filteredVehicles = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();

    if (!query) {
      return this.vehicles().slice(0, 10);
    }

    const results = this.vehicles().filter(
      (v) =>
        (v.plate || '').toLowerCase().includes(query) ||
        (v.brand || '').toLowerCase().includes(query) ||
        (v.model || '').toLowerCase().includes(query) ||
        (v.owner_name || '').toLowerCase().includes(query),
    );

    return results.slice(0, 10);
  });

  // Observable para filtrado en tiempo real de clientes con FormControl (800 clientes)
  filteredOwners$: Observable<Owner[]> = combineLatest([
    this.owners$,
    this.ownerSearchControl.valueChanges.pipe(startWith('')),
  ]).pipe(
    map(([owners, filterValue]) => {
      const filterStr = (filterValue || '').toLowerCase().trim();
      if (!filterStr) {
        return owners;
      }
      return owners.filter(
        (owner) =>
          (owner.name || '').toLowerCase().includes(filterStr) ||
          String(owner.id).includes(filterStr),
      );
    }),
  );

  // Computed: Array de detalles del vehículo seleccionado para el Grid
  selectedVehicleDetails = computed(() => {
    const vehicle = this.selectedVehicle();
    if (!vehicle || this.isUnregisteredVehicle()) return [];

    const formatValue = (val: any) => {
      if (val === null || val === undefined || String(val).trim() === '') {
        return 'N/A';
      }
      return String(val);
    };

    const formatDate = (val: any) => {
      if (val === null || val === undefined || String(val).trim() === '') {
        return 'N/A';
      }
      try {
        const date = new Date(val);
        if (isNaN(date.getTime())) return 'N/A';
        return date.toLocaleDateString('es-ES', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });
      } catch {
        return 'N/A';
      }
    };

    return [
      { label: 'Placa', value: formatValue(vehicle.plate), icon: 'directions_car' },
      { label: 'Cliente', value: formatValue(vehicle.owner_name), icon: 'person' },
      { label: 'Marca GPS', value: formatValue(vehicle.brand), icon: 'branding_watermark' },
      { label: 'Serial GPS', value: formatValue(vehicle.gps_serial), icon: 'router' },
      { label: 'Serial Celular', value: formatValue(vehicle.cel_serial), icon: 'sim_card' },
      { label: 'Número Celular', value: formatValue(vehicle.cel_num), icon: 'phone_iphone' },
      { label: 'Fecha Creación', value: formatDate(vehicle.date_created), icon: 'calendar_today' },
      { label: 'Modelo', value: formatValue(vehicle.model), icon: 'model_training' },
      { label: 'Color', value: formatValue(vehicle.color), icon: 'palette' },
      { label: 'Tipo Vehículo', value: formatValue(vehicle.vehicle_type), icon: 'category' },
      { label: 'Servicio', value: formatValue(vehicle.service), icon: 'settings' },
      { label: 'Estado', value: formatValue(vehicle.status), icon: 'info' },
      { label: 'Cuota Admon', value: formatValue(vehicle.cuo_admon), icon: 'monetization_on' },
      { label: 'IVA', value: formatValue(vehicle.iva), icon: 'receipt' },
      {
        label: 'Prendido/Apagado',
        value: formatValue(vehicle.prend_apag),
        icon: 'power_settings_new',
      },
    ];
  });

  constructor(
    public dialogRef: MatDialogRef<DialogNewInspectionComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { inspectionId?: number } | null,
  ) {}

  ngOnInit(): void {
    if (this.data && this.data.inspectionId) {
      this.isEditing.set(true);
      this.inspectionId.set(this.data.inspectionId);
      this.loadInspectionDetails(this.data.inspectionId);
    } else {
      this.loadVehicles();
    }
    this.loadInspectionTypes();
    this.loadGpsBrands();
    this.loadOwners();
  }

  loadOwners() {
    this.apiService.get<Owner[]>('/owners').subscribe({
      next: (data) => {
        this.owners.set(data || []);
      },
      error: (error) => {
        console.error('Error loading owners:', error);
      },
    });
  }

  loadInspectionDetails(id: number) {
    this.isLoadingVehicles.set(true);
    this.apiService.get<any>(`/inspections/details/${id}`).subscribe({
      next: (res) => {
        if (res) {
          const isUnregistered = !res.vehicle_id || res.vehicle_id.trim() === '';
          this.isUnregisteredVehicle.set(isUnregistered);
          if (isUnregistered) {
            this.unregisteredPlate.set(res.plate);
          }

          const mockVehicle: Vehicle = {
            id: res.vehicle_id || '',
            plate: res.plate,
            owner_name: res.owner_name,
            owner_id: res.owner,
            brand: isUnregistered ? 'N/A' : 'Cargando...',
            model: '',
            is_unregistered: isUnregistered,
          };

          if (isUnregistered) {
            this.selectedVehicle.set(mockVehicle);
            this.selectedInspectionType.set(
              res.inspection_type
                ? res.inspection_type.split(' - ')[1] || res.inspection_type
                : 'Revision General',
            );
            if (res.owner_name) {
              this.ownerSearchControl.setValue(res.owner_name);
              if (res.owner) {
                this.selectedOwner.set({ id: Number(res.owner), name: res.owner_name });
                this.isUnregisteredOwner.set(false);
              } else {
                this.isUnregisteredOwner.set(true);
                this.unregisteredOwnerName.set(res.owner_name);
              }
            }
          } else {
            this.selectVehicle(mockVehicle);
            this.selectedInspectionType.set(
              res.inspection_type.split(' - ')[1] || res.inspection_type,
            );
          }

          this.inspectionForm.patchValue({
            gps_brand_id: res.gps_brand_id || '',
            gps_serial: res.gps_serial,
            celular_number: res.celular_number,
            celular_serial: res.celular_serial,
            installation_way: res.installation_way || res.installation_mode || '',
            description: res.description,
            notes: res.notes,
          });

          this.currentStep.set(1);
          this.isLoadingVehicles.set(false);
        }
      },
      error: (err) => {
        console.error('Error loading inspection details for edit:', err);
        this.isLoadingVehicles.set(false);
        this.snackbarService.openSnackBar('Error al cargar los detalles de la inspección.');
      },
    });
  }

  loadVehicles() {
    this.isLoadingVehicles.set(true);
    this.apiService
      .post<Vehicle[]>('/vehicles/vehicles-per-owner', {})
      .pipe(finalize(() => this.isLoadingVehicles.set(false)))
      .subscribe({
        next: (data) => {
          this.vehicles.set(data || []);
        },
        error: (error) => {
          console.error('Error loading vehicles:', error);
        },
      });
  }

  loadInspectionTypes() {
    this.apiService
      .get<{ id: number; name: string }[]>('/inspections/inspections-types')
      .subscribe({
        next: (data) => {
          this.inspectionTypes.set(data || []);
        },
        error: (error) => {
          console.error('Error loading inspection types:', error);
        },
      });
  }

  loadGpsBrands() {
    this.apiService.get<{ id: string; name: string }[]>('/brands/brands-list').subscribe({
      next: (data) => {
        this.gpsBrands.set(data || []);
      },
      error: (error) => {
        console.error('Error loading GPS brands:', error);
      },
    });
  }

  onSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
  }

  clearSearch() {
    this.searchQuery.set('');
  }

  private cleanVal(val: any): string {
    if (
      !val ||
      val === 'N/A' ||
      String(val).trim() === '' ||
      String(val).trim().toLowerCase() === 'null' ||
      String(val).trim().toLowerCase() === 'undefined'
    ) {
      return '';
    }
    return String(val).trim();
  }

  clearControl(controlName: string) {
    this.inspectionForm.get(controlName)?.setValue('');
  }

  selectVehicle(vehicle: Vehicle) {
    this.isUnregisteredVehicle.set(false);
    this.unregisteredPlate.set('');
    this.selectedVehicle.set(vehicle);

    if (!this.isEditing()) {
      this.inspectionForm.patchValue({
        gps_brand_id: this.cleanVal(vehicle.gps_brand_id || vehicle.brand_id),
        gps_serial: this.cleanVal(vehicle.gps_serial),
        celular_number: this.cleanVal(vehicle.cel_num),
        celular_serial: this.cleanVal(vehicle.cel_serial),
      });
    }

    // Buscar info detallada por placa
    this.apiService.get<Vehicle>(`/vehicles/info?vehicle_plate=${vehicle.plate}`).subscribe({
      next: (fullInfo) => {
        if (fullInfo) {
          const combined = { ...vehicle, ...fullInfo };
          this.selectedVehicle.set(combined);

          if (!this.isEditing()) {
            this.inspectionForm.patchValue({
              gps_brand_id: this.cleanVal(combined.gps_brand_id || combined.brand_id),
              gps_serial: this.cleanVal(combined.gps_serial),
              celular_number: this.cleanVal(combined.cel_num),
              celular_serial: this.cleanVal(combined.cel_serial),
            });
          }
        }
      },
      error: (error) => {
        console.error('Error loading vehicle details:', error);
      },
    });

    this.searchQuery.set('');
  }

  selectUnregisteredVehicle(plate: string) {
    const cleanPlate = plate.trim().toUpperCase();
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '450px',
      panelClass: 'custom-dialog-container',
      data: {
        title: 'Vehículo no registrado',
        content: `¿Está seguro que desea crear la inspección para el vehículo con placa "${cleanPlate}" que no está registrado en el sistema?`,
        confirmText: 'Sí, continuar',
        cancelText: 'Cancelar',
        confirmColor: 'primary',
        iconName: 'directions_car',
        iconColor: 'text-blue-600',
        customButtonClass: 'bg-blue-600! text-white! rounded-lg h-10 px-5 font-semibold shadow-sm',
      } as ConfirmDialogData,
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.isUnregisteredVehicle.set(true);
        this.unregisteredPlate.set(cleanPlate);

        // Auto-seleccionar tipo por defecto (id 01)
        const defaultType = this.inspectionTypes().find(
          (t) => String(t.id).padStart(2, '0') === '01' || t.id === 1,
        );
        if (defaultType) {
          this.selectedInspectionType.set(defaultType.name);
        } else {
          this.selectedInspectionType.set('Revision General');
        }

        const mockVehicle: Vehicle = {
          id: '',
          plate: cleanPlate,
          brand: 'N/A',
          model: 'N/A',
          is_unregistered: true,
        };
        this.selectedVehicle.set(mockVehicle);
        this.searchQuery.set('');
      }
    });
  }

  onOwnerSelected(event: MatOptionSelectionChange, owner: Owner) {
    if (event.isUserInput) {
      this.selectedOwner.set(owner);
      this.isUnregisteredOwner.set(false);
      this.unregisteredOwnerName.set('');
      this.ownerSearchControl.setValue(owner.name);
    }
  }

  onUnregisteredOwnerSelected(event: MatOptionSelectionChange, ownerName: string) {
    if (event.isUserInput) {
      const cleanName = ownerName.trim();
      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        width: '450px',
        panelClass: 'custom-dialog-container',
        data: {
          title: 'Cliente no registrado',
          content: `¿Está seguro que desea asociar el cliente "${cleanName}" que no está registrado en el sistema?`,
          confirmText: 'Sí, continuar',
          cancelText: 'Cancelar',
          confirmColor: 'primary',
          iconName: 'person_add',
          iconColor: 'text-blue-600',
          customButtonClass:
            'bg-blue-600! text-white! rounded-lg h-10 px-5 font-semibold shadow-sm',
        } as ConfirmDialogData,
      });

      dialogRef.afterClosed().subscribe((confirmed) => {
        if (confirmed) {
          this.selectedOwner.set(null);
          this.isUnregisteredOwner.set(true);
          this.unregisteredOwnerName.set(cleanName);
          this.ownerSearchControl.setValue(cleanName, { emitEvent: false });
        } else {
          this.clearOwnerSelection();
        }
      });
    }
  }

  clearOwnerSelection() {
    this.selectedOwner.set(null);
    this.isUnregisteredOwner.set(false);
    this.unregisteredOwnerName.set('');
    this.ownerSearchControl.setValue('');
  }

  changeVehicle() {
    this.selectedVehicle.set(null);
    this.selectedInspectionType.set(null);
    this.isUnregisteredVehicle.set(false);
    this.unregisteredPlate.set('');
    this.selectedOwner.set(null);
    this.isUnregisteredOwner.set(false);
    this.unregisteredOwnerName.set('');
    this.ownerSearchControl.setValue('');
    this.inspectionId.set(null);
    this.inspectionForm.reset();
    this.currentStep.set(1);
  }

  closeDialog() {
    this.dialogRef.close(this.dataSaved() || !!this.inspectionId());
  }

  nextStep() {
    if (this.isUnregisteredVehicle()) {
      if (!this.selectedInspectionType()) {
        const defaultType = this.inspectionTypes().find(
          (t) => String(t.id).padStart(2, '0') === '01' || t.id === 1,
        );
        this.selectedInspectionType.set(defaultType ? defaultType.name : 'Revision General');
      }
      this.currentStep.set(2);
      return;
    }

    if (this.selectedVehicle() && this.selectedInspectionType()) {
      if (!this.isEditing()) {
        const vehicle = this.selectedVehicle()!;
        const currentVals = this.inspectionForm.value;
        this.inspectionForm.patchValue({
          gps_brand_id:
            currentVals.gps_brand_id || this.cleanVal(vehicle.gps_brand_id || vehicle.brand_id),
          gps_serial: currentVals.gps_serial || this.cleanVal(vehicle.gps_serial),
          celular_number: currentVals.celular_number || this.cleanVal(vehicle.cel_num),
          celular_serial: currentVals.celular_serial || this.cleanVal(vehicle.cel_serial),
        });
      }

      this.currentStep.set(2);
    }
  }

  prevStep() {
    this.currentStep.set(1);
  }

  isFormValid(): boolean {
    if (this.inspectionForm.invalid) {
      return false;
    }
    if (this.isUnregisteredVehicle()) {
      const ownerVal = (this.ownerSearchControl.value || '').trim();
      if (!ownerVal) {
        return false;
      }
    }
    return true;
  }

  finishInspection() {
    if (!this.isFormValid() || !this.selectedVehicle()) {
      if (this.isUnregisteredVehicle() && !(this.ownerSearchControl.value || '').trim()) {
        this.snackbarService.openSnackBar('Debe ingresar o seleccionar un cliente para continuar.');
      }
      return;
    }

    this.currentStep.set(3);

    const vehicle = this.selectedVehicle()!;
    const formValue = this.inspectionForm.value;

    let inspection_type_id = '01';
    if (!this.isUnregisteredVehicle()) {
      const matchedType = this.inspectionTypes().find(
        (t) => t.name === this.selectedInspectionType(),
      );
      inspection_type_id = matchedType ? String(matchedType.id).padStart(2, '0') : '01';
    }

    const currentOwnerName = (this.ownerSearchControl.value || '').trim();
    const ownerId = this.isUnregisteredOwner()
      ? ''
      : this.selectedOwner()
        ? String(this.selectedOwner()!.id)
        : '';
    const ownerName = this.isUnregisteredOwner()
      ? this.unregisteredOwnerName()
      : this.selectedOwner()
        ? this.selectedOwner()!.name
        : currentOwnerName;

    const payload = {
      vehicle_id: this.isUnregisteredVehicle() ? '' : String(vehicle.id),
      inspection_type_id: inspection_type_id,
      gps_brand_id: formValue.gps_brand_id || '',
      gps_serial: formValue.gps_serial || '',
      celular_number: formValue.celular_number || '',
      celular_serial: formValue.celular_serial || '',
      installation_way: formValue.installation_way || '',
      description: formValue.description || '',
      notes: formValue.notes || '',
      plate: this.isUnregisteredVehicle() ? this.unregisteredPlate() : vehicle.plate,
      owner_name: this.isUnregisteredVehicle() ? ownerName : vehicle.owner_name || '',
      owner_id: this.isUnregisteredVehicle() ? ownerId : vehicle.owner_id || '',
      is_unregistered_vehicle: this.isUnregisteredVehicle(),
      is_unregistered_owner: this.isUnregisteredVehicle()
        ? !this.selectedOwner() || this.isUnregisteredOwner()
        : false,
    };

    if (this.isEditing()) {
      this.apiService
        .put<{ message: string }>(`/inspections/update/${this.inspectionId()}`, payload)
        .subscribe({
          next: (res) => {
            this.snackbarService.openSnackBar('Se ha actualizado la inspección correctamente.');
            this.dataSaved.set(true);
            this.currentStep.set(4);
          },
          error: (error) => {
            console.error('Error updating inspection:', error);
            this.snackbarService.openSnackBar('Ha ocurrido un error al actualizar la inspección.');
            this.currentStep.set(2);
          },
        });
    } else {
      this.apiService.post<{ id: number }>('/inspections/create-inspection', payload).subscribe({
        next: (res) => {
          if (res && res.id) {
            this.inspectionId.set(res.id);
            this.dataSaved.set(true);
            this.snackbarService.openSnackBar('Se ha creado la inspección correctamente.');
            this.currentStep.set(4);
          }
        },
        error: (error) => {
          console.error('Error creating inspection:', error);
          this.snackbarService.openSnackBar('Ha ocurrido un error al crear la inspección.');
          this.currentStep.set(2);
        },
      });
    }
  }

  completeWizard(photos: string[]) {
    if (!photos || photos.length === 0 || !this.inspectionId()) {
      return;
    }

    this.currentStep.set(5);

    const formData = new FormData();
    photos.forEach((photo, index) => {
      try {
        const file = this.dataURLtoFile(photo, `foto_${index + 1}.jpg`);
        formData.append('files', file);
      } catch (e) {
        console.error('Error parsing photo base64:', e);
      }
    });

    const id = this.inspectionId()!;
    this.apiService
      .postFormData<{ message: string }>(`/inspections/upload-images/${id}`, formData)
      .subscribe({
        next: (res) => {
          console.log('Images uploaded successfully:', res.message);
          this.snackbarService.openSnackBar(
            'Se han subido las fotos correctamente. ¡Inspección finalizada!',
          );
          this.currentStep.set(6);
        },
        error: (error) => {
          console.error('Error uploading images:', error);
          this.snackbarService.openSnackBar('Ha ocurrido un error al subir las fotos.');
          this.currentStep.set(4);
        },
      });
  }

  private dataURLtoFile(dataurl: string, filename: string): File {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  }

  onSignatureFinish(signature: string) {
    if (!signature || !this.inspectionId()) {
      return;
    }

    const file = this.dataURLtoFile(signature, 'firma.png');
    const formData = new FormData();
    formData.append('signature', file);

    const id = this.inspectionId()!;
    this.apiService
      .postFormData<{ message: string }>(`/inspections/upload-signature/${id}`, formData)
      .subscribe({
        next: (res) => {
          console.log('Signature uploaded successfully:', res.message);
          this.snackbarService.openSnackBar('Se ha subido la firma correctamente.');
          this.dialogRef.close(true);
        },
        error: (error) => {
          console.error('Error uploading signature:', error);
          this.snackbarService.openSnackBar('Ha ocurrido un error al subir la firma.');
        },
      });
  }
}
