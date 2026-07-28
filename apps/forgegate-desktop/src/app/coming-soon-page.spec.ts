import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterOutlet } from '@angular/router';
import { ComingSoonPage } from './coming-soon-page';

@Component({
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
class HostComponent {}

describe('ComingSoonPage', () => {
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        provideRouter([
          {
            path: 'releases',
            component: ComingSoonPage,
            data: { title: 'Releases', description: 'Release policy is not built yet.' },
          },
          { path: 'no-data', component: ComingSoonPage },
        ]),
      ],
    }).compileComponents();
    router = TestBed.inject(Router);
  });

  it('renders the title and description from route data', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await router.navigateByUrl('/releases');
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toBe('Releases');
    expect(compiled.querySelector('p')?.textContent).toBe('Release policy is not built yet.');
  });

  it('falls back to an honest default when no route data is provided', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await router.navigateByUrl('/no-data');
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toBe('Coming soon');
    expect(compiled.querySelector('p')?.textContent).toBe('This screen is not built yet.');
  });
});
