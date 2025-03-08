import { Component, inject, model } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidemenuComponent } from '../../components/sidemenu/sidemenu.component';
import { MenuIconComponent } from '../../components/menu-icon/menu-icon.component';
import { TopNavbarService } from '../../services/top-navbar.service';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-base',
  imports: [RouterOutlet, SidemenuComponent, MenuIconComponent, NgClass],
  templateUrl: './base.component.html',
  styleUrl: './base.component.scss'
})
export class BaseComponent {
  readonly topNavbarService = inject(TopNavbarService);
  readonly showMenu = model(false);
}
