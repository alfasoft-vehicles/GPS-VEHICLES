import { Component, input, output, signal, OnInit, OnDestroy } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-search-header',
  standalone: false,
  templateUrl: './search-header.component.html',
  styleUrl: './search-header.component.css',
})
export class SearchHeaderComponent implements OnInit, OnDestroy {
  actionButtonLabel = input<string>();
  initialValue = input<string>('');

  search = output<string>();
  add = output<void>();

  query = signal('');

  private searchSubject = new Subject<string>();
  private searchSub?: Subscription;

  ngOnInit() {
    if (this.initialValue()) {
      this.query.set(this.initialValue());
    }

    this.searchSub = this.searchSubject
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe((value) => {
        this.search.emit(value);
      });
  }

  ngOnDestroy() {
    this.searchSub?.unsubscribe();
  }

  onSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.query.set(value);
    this.searchSubject.next(value);
  }

  clearSearch() {
    this.query.set('');
    this.searchSubject.next('');
  }
}
