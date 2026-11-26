import { Routes } from '@angular/router';
import { LoginComponent } from './login.component';
import { DashboardComponent } from './dashboard.component';
import { ZapBuilderComponent } from './zap-builder.component';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'zaps/new', component: ZapBuilderComponent },
  { path: 'zaps/:id', component: ZapBuilderComponent },
  { path: '**', redirectTo: '/dashboard' },
];
