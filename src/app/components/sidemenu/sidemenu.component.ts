import { Component } from '@angular/core';
import { RouterLink, RouterModule } from '@angular/router';
import { TOOLS } from '../../utils/constants';
import { LucideAngularModule } from 'lucide-angular';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-sidemenu',
  imports: [RouterModule, LucideAngularModule, NgClass],
  templateUrl: './sidemenu.component.html',
  styleUrl: './sidemenu.component.scss'
})
export class SidemenuComponent {
  readonly tools = TOOLS;
}
