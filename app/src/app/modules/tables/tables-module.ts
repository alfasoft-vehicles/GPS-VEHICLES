import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TablesRoutingModule } from './tables-routing-module';
import { DashboardViewComponent } from './pages/dashboard-view/dashboard-view.component';
import { ExampleTabComponent } from './components/example-tab/example-tab.component';
import { VehiclesComponent } from './components/vehicles/vehicles.component';
import { OwnersComponent } from './components/owners/owners.component';
import { InventoryComponent } from './components/inventory/inventory.component';
import { SearchHeaderComponent } from './components/search-header/search-header.component';
import { SharedModule } from '../../shared/shared-module';
import { NoResultDataComponent } from './components/no-result-data/no-result-data.component';
import { OwnerDetailsDialogComponent } from './dialogs/owner-details-dialog/owner-details-dialog.component';

@NgModule({
  declarations: [
    DashboardViewComponent,
    ExampleTabComponent,
    VehiclesComponent,
    OwnersComponent,
    InventoryComponent,
    SearchHeaderComponent,
    NoResultDataComponent,
    OwnerDetailsDialogComponent,
  ],
  imports: [CommonModule, TablesRoutingModule, SharedModule],
})
export class TablesModule {}
