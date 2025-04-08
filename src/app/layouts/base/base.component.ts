import { Component, inject, model, OnInit } from '@angular/core';
import { NavigationEnd, NavigationStart, Router, RouterOutlet } from '@angular/router';
import { SidemenuComponent } from '../../components/sidemenu/sidemenu.component';
import { MenuIconComponent } from '../../components/menu-icon/menu-icon.component';
import { TopNavbarService } from '../../services/top-navbar.service';
import { NgClass } from '@angular/common';
import { filter } from 'rxjs';

@Component({
  selector: 'app-base',
  imports: [RouterOutlet, SidemenuComponent, MenuIconComponent, NgClass],
  templateUrl: './base.component.html',
  styleUrl: './base.component.scss'
})
export class BaseComponent implements OnInit{


  readonly router = inject(Router);
  readonly topNavbarService = inject(TopNavbarService);
  readonly showMenu = model(false);

  ngOnInit(): void {
    this.router.events.pipe(filter(event => event instanceof NavigationStart && this.showMenu())).subscribe(() => {
      this.showMenu.set(false);
    });
  }

}
