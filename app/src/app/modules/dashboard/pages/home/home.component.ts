import { Component } from '@angular/core';

export interface MenuOption {
  title: string;
  description: string;
  icon: string;
  route: string;
  colorClass: string;
  iconBg?: string;
  borderColor?: string;
  disabled?: boolean;
  tooltip?: string;
}

@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  menuOptions: MenuOption[] = [
    {
      title: 'Tablas Informativas', // Le di un nombre más formal
      description: 'Gestión de clientes, seriales, marcas y vehículos.', // Texto de soporte
      icon: 'table_view',
      route: '/tablas',
      // Usamos gradientes sutiles o colores sólidos más amplios
      colorClass: 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white',
      iconBg: 'bg-indigo-100 group-hover:bg-white/20',
      borderColor: 'hover:border-indigo-200',
      disabled: true,
      tooltip: '¡Próximamente!',
    },
    {
      title: 'Inspecciones',
      description: 'Auditoría, revisión y control de estado de la flota.',
      icon: 'fact_check',
      route: '/inspecciones',
      colorClass: 'bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white',
      iconBg: 'bg-rose-100 group-hover:bg-white/20',
      borderColor: 'hover:border-rose-200',
      disabled: false,
    },
  ];
}
