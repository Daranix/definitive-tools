import {
  Component,
  inject,
  model,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  NavigationEnd,
  NavigationStart,
  Router,
  RouterLink,
  RouterOutlet,
} from '@angular/router';
import { SidemenuComponent } from '../../components/sidemenu/sidemenu.component';
import { MenuIconComponent } from '../../components/menu-icon/menu-icon.component';
import { TopNavbarService } from '../../services/top-navbar.service';
import { NgClass } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideIconComponent } from '@/app/components/lucide-icon/lucide-icon.component';
import { LanguageSwitcherComponent } from '@/app/components/language-switcher/language-switcher.component';
import { LocalizeUrlPipe } from '@/app/pipes/localize-url.pipe';
import { filter } from 'rxjs';

@Component({
  selector: 'app-base',
  imports: [
    RouterOutlet,
    RouterLink,
    SidemenuComponent,
    MenuIconComponent,
    NgClass,
    LucideIconComponent,
    LanguageSwitcherComponent,
    LocalizeUrlPipe,
    TranslatePipe,
  ],
  templateUrl: './base.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './base.component.scss',
})
export class BaseComponent implements OnInit {
  readonly router = inject(Router);
  readonly topNavbarService = inject(TopNavbarService);
  readonly showMenu = model(false);

  ngOnInit(): void {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationStart && this.showMenu()),
      )
      .subscribe(() => {
        this.showMenu.set(false);
      });
  }
}
