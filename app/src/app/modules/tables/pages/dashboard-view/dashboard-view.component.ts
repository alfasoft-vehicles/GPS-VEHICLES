import { Component, OnDestroy, inject } from '@angular/core';
import { TablesService } from '../../services/tables.service';

@Component({
  selector: 'app-dashboard-view',
  standalone: false,
  templateUrl: './dashboard-view.component.html',
  styleUrl: './dashboard-view.component.css',
})
export class DashboardViewComponent implements OnDestroy {
  private tablesService = inject(TablesService);

  ngOnDestroy(): void {
    this.tablesService.clearCache();
  }
}
