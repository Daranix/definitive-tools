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
            { path: 'qr-generator', loadComponent: () => import('./pages/qr-generator/qr-generator.component').then(m => m.QrGeneratorComponent), data: { id: 'qr-generator' } },
            { path: 'background-remover', loadComponent: () => import('./pages/background-remover/background-remover.component').then(m => m.BackgroundRemoverComponent), data: { id: 'background-remover' } },
            { path: 'base64-encoder-decoder', loadComponent: () => import('./pages/base64/base64.component').then(m => m.Base64Component), data: { id: 'base64-encoder-decoder' } },
            { path: 'random-password-generator', loadComponent: () => import('./pages/random-password-generator/random-password-generator.component').then(m => m.RandomPasswordGeneratorComponent), data: { id: 'random-password-generator' } },
            { path: 'jwt-decode-encode', loadComponent: () => import('./pages/jwt-decode-encode/jwt-decode-encode.component').then(m => m.JwtDecodeEncodeComponent), data: { id: 'jwt-decode-encode' } },
            { path: 'opengraph-generator', loadComponent: () => import('./pages/opengraph-generator/opengraph-generator.component').then(m => m.OpengraphGeneratorComponent), data: { id: 'opengraph-generator' } },
            { path: 'swagger-editor', loadComponent: () => import('./pages/swagger-editor/swagger-editor.component').then(m => m.SwaggerEditorComponent), data: { id: 'swagger-editor' } },
            { path: 'markdown-to-excel', loadComponent: () => import('./pages/markdown-to-excel/markdown-to-excel.component').then(m => m.MarkdownToExcelComponent), data: { id: 'markdown-to-excel' } },
            { path: 'markdown-to-pdf', loadComponent: () => import('./pages/markdown-to-pdf/markdown-to-pdf.component').then(m => m.MarkdownToPdfComponent), data: { id: 'markdown-to-pdf' } },
            { path: 'markdown-to-html', loadComponent: () => import('./pages/markdown-to-html/markdown-to-html.component').then(m => m.MarkdownToHtmlComponent), data: { id: 'markdown-to-html' } },
        ],
        component: BaseComponent
    },
    {
        path: '**',
        redirectTo: '/'
    }
];
