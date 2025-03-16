import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { BaseComponent } from './layouts/base/base.component';

export const routes: Routes = [
    {
        path: '',
        component: HomeComponent
    },
    {
        path: 'tool',
        children: [
            { path: '', redirectTo: 'home', pathMatch: 'full' },
            { path: 'qr-generator', loadComponent: () => import('./pages/qr-generator/qr-generator.component').then(m => m.QrGeneratorComponent) },
            { path: 'background-remover', loadComponent: () => import('./pages/background-remover/background-remover.component').then(m => m.BackgroundRemoverComponent) },
            { path: 'base64-encoder-decoder', loadComponent: () => import('./pages/base64/base64.component').then(m => m.Base64Component) },
            { path: 'random-password-generator', loadComponent: () => import('./pages/random-password-generator/random-password-generator.component').then(m => m.RandomPasswordGeneratorComponent) },
            { path: 'audio-speech-to-text', loadComponent: () => import('./pages/audio-speech-to-text/audio-speech-to-text.component').then(m => m.AudioSpeechToTextComponent) },
        ],
        component: BaseComponent
    },
    {
        path: '**',
        redirectTo: '/error'
    }
];
