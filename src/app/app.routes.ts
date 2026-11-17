import { Route, Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { BaseComponent } from './layouts/base/base.component';
import { DEFAULT_LANGUAGE, Language } from './i18n/languages';

type LazyComponent = NonNullable<Route['loadComponent']>;

interface ToolRouteDefinition {
  /** Language independent path below `tool/`. */
  path: string;
  id: string;
  loadComponent: LazyComponent;
}

const TOOL_ROUTES: ReadonlyArray<ToolRouteDefinition> = [
  { path: 'meme-generator', id: 'meme-generator', loadComponent: () => import('./pages/meme-generator/meme-generator.component').then((m) => m.MemeGeneratorComponent) },
  { path: 'qr-generator', id: 'qr-generator', loadComponent: () => import('./pages/qr-generator/qr-generator.component').then((m) => m.QrGeneratorComponent) },
  { path: 'qr-reader', id: 'qr-reader', loadComponent: () => import('./pages/qr-reader/qr-reader.component').then((m) => m.QrReaderComponent) },
  { path: 'background-remover', id: 'background-remover', loadComponent: () => import('./pages/background-remover/background-remover.component').then((m) => m.BackgroundRemoverComponent) },
  { path: 'image-converter', id: 'image-converter', loadComponent: () => import('./pages/image-converter/image-converter.component').then((m) => m.ImageConverterComponent) },
  { path: 'base64-encoder-decoder', id: 'base64-encoder-decoder', loadComponent: () => import('./pages/base64/base64.component').then((m) => m.Base64Component) },
  { path: 'image-base64-converter', id: 'image-base64-converter', loadComponent: () => import('./pages/image-base64/image-base64.component').then((m) => m.ImageBase64Component) },
  { path: 'text-to-speech', id: 'text-to-speech', loadComponent: () => import('./pages/text-to-speech/text-to-speech.component').then((m) => m.TextToSpeechComponent) },
  { path: 'audio-speech-to-text', id: 'audio-speech-to-text', loadComponent: () => import('./pages/audio-speech-to-text/audio-speech-to-text.component').then((m) => m.AudioSpeechToTextComponent) },
  { path: 'random-password-generator', id: 'random-password-generator', loadComponent: () => import('./pages/random-password-generator/random-password-generator.component').then((m) => m.RandomPasswordGeneratorComponent) },
  { path: 'jwt-decode-encode', id: 'jwt-decode-encode', loadComponent: () => import('./pages/jwt-decode-encode/jwt-decode-encode.component').then((m) => m.JwtDecodeEncodeComponent) },
  { path: 'opengraph-generator', id: 'opengraph-generator', loadComponent: () => import('./pages/opengraph-generator/opengraph-generator.component').then((m) => m.OpengraphGeneratorComponent) },
  { path: 'swagger-editor', id: 'swagger-editor', loadComponent: () => import('./pages/swagger-editor/swagger-editor.component').then((m) => m.SwaggerEditorComponent) },
  { path: 'markdown-to-excel', id: 'markdown-to-excel', loadComponent: () => import('./pages/markdown-to-excel/markdown-to-excel.component').then((m) => m.MarkdownToExcelComponent) },
  { path: 'markdown-to-pdf', id: 'markdown-to-pdf', loadComponent: () => import('./pages/markdown-to-pdf/markdown-to-pdf.component').then((m) => m.MarkdownToPdfComponent) },
  { path: 'markdown-to-html', id: 'markdown-to-html', loadComponent: () => import('./pages/markdown-to-html/markdown-to-html.component').then((m) => m.MarkdownToHtmlComponent) },
  { path: 'audio-editor', id: 'audio-editor', loadComponent: () => import('./pages/audio-editor/audio-editor.component').then((m) => m.AudioEditorComponent) },
  { path: 'madrid-transport-map', id: 'madrid-transport-map', loadComponent: () => import('./pages/madrid-transport-map/madrid-transport-map.component').then((m) => m.MadridTransportMapComponent) },
  { path: 'madrid-zbe-map', id: 'madrid-zbe-map', loadComponent: () => import('./pages/madrid-zbe-map/madrid-zbe-map.component').then((m) => m.MadridZbeMapComponent) },
  { path: 'regla-de-tres', id: 'regla-de-tres', loadComponent: () => import('./pages/calculator/rule-of-three/rule-of-three.component').then((m) => m.RuleOfThreeComponent) },
  { path: 'salario-neto-espana', id: 'salario-neto-espana', loadComponent: () => import('./pages/calculator/spain-net-salary/spain-net-salary.component').then((m) => m.SpainNetSalaryComponent) },
  { path: 'indemnizacion-despido-espana', id: 'indemnizacion-despido-espana', loadComponent: () => import('./pages/calculator/spain-severance/spain-severance.component').then((m) => m.SpainSeveranceComponent) },
  { path: 'calculadora-hipoteca', id: 'calculadora-hipoteca', loadComponent: () => import('./pages/calculator/mortgage/mortgage.component').then((m) => m.MortgageComponent) },
  { path: 'calculadora-cientifica', id: 'calculadora-cientifica', loadComponent: () => import('./pages/calculator/scientific/scientific.component').then((m) => m.ScientificComponent) },
];

/**
 * Builds a router path for a language.
 *
 * English is the default language and keeps unprefixed paths (`tool/qr-generator`);
 * every other language is nested under its prefix (`es/tool/qr-generator`).
 */
function routePath(path: string, language: Language): string {
  if (language === DEFAULT_LANGUAGE) return path;
  return path ? `${language}/${path}` : language;
}

/** Same route tree mounted once per supported language. */
function buildRoutes(language: Language): Routes {
  return [
    {
      path: routePath('', language),
      pathMatch: 'full',
      component: HomeComponent,
    },
    {
      path: routePath('tool', language),
      component: BaseComponent,
      children: [
        { path: '', redirectTo: routePath('', language), pathMatch: 'full' },
        ...TOOL_ROUTES.map((tool) => ({
          path: tool.path,
          loadComponent: tool.loadComponent,
          data: { id: tool.id },
        })),
        { path: 'madrid-360', redirectTo: 'madrid-zbe-map' },
        { path: 'madrid-360-map', redirectTo: 'madrid-zbe-map' },
      ],
    },
    {
      path: routePath('legal/:doc', language),
      loadComponent: () =>
        import('./pages/legal/legal.component').then((m) => m.LegalComponent),
    },
  ];
}

export const routes: Routes = [
  ...buildRoutes(DEFAULT_LANGUAGE),
  ...buildRoutes('es'),
  {
    path: '**',
    redirectTo: '/',
  },
];
