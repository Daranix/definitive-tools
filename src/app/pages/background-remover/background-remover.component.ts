import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-background-remover',
  imports: [RouterLink, LucideAngularModule],
  templateUrl: './background-remover.component.html',
  styleUrl: './background-remover.component.scss'
})
export class BackgroundRemoverComponent {

}
