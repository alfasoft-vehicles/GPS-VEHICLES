import { Component, computed, signal, inject, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Vehicle } from '../../interfaces/vehicles.interface';
import { ApiService } from '../../../../core/services/api.service';
import { SnackbarService } from '../../../../core/services/snackbar.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-dialog-new-inspection',
  standalone: false,
  templateUrl: './dialog-new-inspection.component.html',
  styleUrls: ['./dialog-new-inspection.component.css'],
})
export class DialogNewInspectionComponent implements OnInit {
  private apiService = inject(ApiService);
  private snackbarService = inject(SnackbarService);

  // Lista de vehículos
  vehicles = signal<Vehicle[]>([]);
  isLoadingVehicles = signal<boolean>(true);

  // Estado de búsqueda
  searchQuery = signal<string>('');

  // Vehículo seleccionado (null si no hay selección)
  selectedVehicle = signal<Vehicle | null>(null);

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

  // ... (rest of signals/computed unchanged)

  // COMPUTED: Filtrado Local Ultra-Rápido con Protección de DOM
  filteredVehicles = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();

    // 1. ESTADO INICIAL: Si no hay búsqueda, mostramos los primeros 10
    if (!query) {
      return this.vehicles().slice(0, 10);
    }

    // 2. BÚSQUEDA: Filtramos todo el array en memoria
    const results = this.vehicles().filter(
      (v) =>
        (v.plate || '').toLowerCase().includes(query) ||
        (v.brand || '').toLowerCase().includes(query) ||
        (v.model || '').toLowerCase().includes(query) ||
        (v.owner_name || '').toLowerCase().includes(query),
    );

    // 3. PROTECCIÓN DEL HTML: Sin importar cuántos coincidan, solo renderizamos 10
    return results.slice(0, 10);
  });

  // Computed: Array de detalles del vehículo seleccionado para el Grid
  selectedVehicleDetails = computed(() => {
    const vehicle = this.selectedVehicle();
    if (!vehicle) return [];

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

    // Mapeamos los datos para iterar fácilmente en el HTML
    return [
      { label: 'Placa', value: formatValue(vehicle.plate), icon: 'directions_car' },
      { label: 'Propietario', value: formatValue(vehicle.owner_name), icon: 'person' },
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
  }

  loadInspectionDetails(id: number) {
    this.isLoadingVehicles.set(true);
    this.apiService.get<any>(`/inspections/details/${id}`).subscribe({
      next: (res) => {
        if (res) {
          // Mapeamos los datos de la inspección al formato del vehículo y formulario
          const mockVehicle: Vehicle = {
            id: res.vehicle_id,
            plate: res.plate,
            owner_name: res.owner_name,
            owner_id: res.owner,
            brand: 'Cargando...', // Estos se actualizarán con selectVehicle
            model: '',
          };

          this.selectVehicle(mockVehicle);
          this.selectedInspectionType.set(
            res.inspection_type.split(' - ')[1] || res.inspection_type,
          );

          this.inspectionForm.patchValue({
            gps_brand_id: res.gps_brand_id || '',
            gps_serial: res.gps_serial,
            celular_number: res.celular_number,
            celular_serial: res.celular_serial,
            installation_way: res.installation_way || res.installation_mode || '',
            description: res.description,
            notes: res.notes,
          });

          // En modo edición, mostramos el Paso 1 para permitir cambiar el tipo de inspección
          // pero manteniendo el vehículo bloqueado.
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

    // Opcional: Limpiar búsqueda al seleccionar
    this.searchQuery.set('');
  }

  changeVehicle() {
    this.selectedVehicle.set(null);
    this.selectedInspectionType.set(null); // Importante: Limpiamos el tipo si cambia de carro
    this.inspectionId.set(null);
    this.inspectionForm.reset();
    this.currentStep.set(1);
  }

  closeDialog() {
    this.dialogRef.close(this.dataSaved() || !!this.inspectionId());
  }

  nextStep() {
    // Verificamos que ambas cosas estén seleccionadas
    if (this.selectedVehicle() && this.selectedInspectionType()) {
      console.log('Procediendo con vehículo:', this.selectedVehicle()?.plate);
      console.log('Tipo de Inspección:', this.selectedInspectionType());

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

  finishInspection() {
    if (this.inspectionForm.invalid || !this.selectedVehicle() || !this.selectedInspectionType()) {
      return;
    }

    // Cambiamos al Paso 3 (Pantalla de Carga)
    this.currentStep.set(3);

    const vehicle = this.selectedVehicle()!;
    const formValue = this.inspectionForm.value;

    const matchedType = this.inspectionTypes().find(
      (t) => t.name === this.selectedInspectionType(),
    );
    const inspection_type_id = matchedType ? String(matchedType.id) : '';

    const payload = {
      vehicle_id: String(vehicle.id),
      inspection_type_id: inspection_type_id,
      gps_brand_id: formValue.gps_brand_id || '',
      gps_serial: formValue.gps_serial || '',
      celular_number: formValue.celular_number || '',
      celular_serial: formValue.celular_serial || '',
      installation_way: formValue.installation_way || '',
      description: formValue.description || '',
      notes: formValue.notes || '',
    };

    if (this.isEditing()) {
      this.apiService
        .put<{ message: string }>(`/inspections/update/${this.inspectionId()}`, payload)
        .subscribe({
          next: (res) => {
            this.snackbarService.openSnackBar('Se ha actualizado la inspección correctamente.');
            this.dataSaved.set(true);
            // Después de editar, según el requerimiento, podríamos ir a fotos/firma o cerrar.
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
            this.currentStep.set(4); // Avanzamos al Paso 4 (Cámara)
          }
        },
        error: (error) => {
          console.error('Error creating inspection:', error);
          this.snackbarService.openSnackBar('Ha ocurrido un error al crear la inspección.');
          // Si hay un error, volvemos al Paso 2 para permitir correcciones/reintentos
          this.currentStep.set(2);
        },
      });
    }
  }

  // Se llama cuando la cámara termina de capturar
  completeWizard(photos: string[]) {
    if (!photos || photos.length === 0 || !this.inspectionId()) {
      return;
    }

    // Cambiamos al Paso 5 (Pantalla de Carga para la firma)
    this.currentStep.set(5);

    // Convertimos las fotos Base64 en objetos File y las añadimos a FormData
    const formData = new FormData();
    photos.forEach((photo, index) => {
      try {
        const file = this.dataURLtoFile(photo, `foto_${index + 1}.jpg`);
        formData.append('files', file);
      } catch (e) {
        console.error('Error parsing photo base64:', e);
      }
    });

    // Llamamos al endpoint de cargar imágenes
    const id = this.inspectionId()!;
    this.apiService
      .postFormData<{ message: string }>(`/inspections/upload-images/${id}`, formData)
      .subscribe({
        next: (res) => {
          console.log('Images uploaded successfully:', res.message);
          this.snackbarService.openSnackBar(
            'Se han subido las fotos correctamente. ¡Inspección finalizada!',
          );
          // Avanzamos al Paso 6 (Firma)
          this.currentStep.set(6);
        },
        error: (error) => {
          console.error('Error uploading images:', error);
          this.snackbarService.openSnackBar('Ha ocurrido un error al subir las fotos.');
          // Si hay error, regresamos al Paso 4 (Cámara) para que intente de nuevo
          this.currentStep.set(4);
        },
      });
  }

  // Helper para convertir Base64 Data URL en un objeto File
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
          this.dialogRef.close(true); // Cerramos el modal grande definitivamente con true (se guardó algo)
        },
        error: (error) => {
          console.error('Error uploading signature:', error);
          this.snackbarService.openSnackBar('Ha ocurrido un error al subir la firma.');
        },
      });
  }
}
