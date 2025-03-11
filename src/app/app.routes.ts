import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { BaseComponent } from './layouts/base/base.component';
import { QrGeneratorComponent } from './pages/qr-generator/qr-generator.component';
import { BackgroundRemoverComponent } from './pages/background-remover/background-remover.component';

export const routes: Routes = [
    {
        path: '',
        component: HomeComponent
    },
    {
        path: 'tool',
        children: [
            { path: '', redirectTo: 'home', pathMatch: 'full' },
            { path: 'qr-generator', component: QrGeneratorComponent },
            { path: 'background-remover', component: BackgroundRemoverComponent },
        ],
        component: BaseComponent
    },
    {
        path: '**',
        redirectTo: '/error'
    }
];
