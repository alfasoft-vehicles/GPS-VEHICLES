import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TablesRoutingModule } from './tables-routing-module';
import { DashboardViewComponent } from './pages/dashboard-view/dashboard-view.component';
import { GroupsComponent } from './pages/groups/groups.component';
import { VehiclesComponent } from './pages/vehicles/vehicles.component';
import { OwnersComponent } from './pages/owners/owners.component';
import { SearchHeaderComponent } from './components/search-header/search-header.component';
import { SharedModule } from '../../shared/shared-module';
import { NoResultDataComponent } from './components/no-result-data/no-result-data.component';

@NgModule({
  declarations: [
    DashboardViewComponent,
    GroupsComponent,
    VehiclesComponent,
    OwnersComponent,
    SearchHeaderComponent,
    NoResultDataComponent,
  ],
  imports: [CommonModule, TablesRoutingModule, SharedModule],
})
export class TablesModule {}
