import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, File } from 'lucide-angular';
import { TOOLS } from '../../utils/constants';

@Component({
  selector: 'app-home',
  imports: [LucideAngularModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {

  readonly tools = TOOLS;

}
