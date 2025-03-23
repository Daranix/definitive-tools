import { TOOLS } from '@/app/utils/constants';
import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-top-navbar',
  imports: [LucideAngularModule, RouterLink],
  templateUrl: './top-navbar.component.html',
  styleUrl: './top-navbar.component.scss'
})
export class TopNavbarComponent {


  readonly activatedRoute = inject(ActivatedRoute);
  readonly info = computed(() => this.getToolInfo());

  private getToolInfo() {
    const id = this.activatedRoute.snapshot.data['id'];
    const tool = TOOLS.find(tool => tool.id === id);
    if(tool) {
      return tool;
    }

    return undefined;
  }

}
