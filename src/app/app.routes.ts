import { Routes } from "@angular/router";
import { Dashboard } from "./pages/dashboard/dashboard";
import { Tools } from "./pages/tools/tools";
import { KnowledgeBases } from "./pages/knowledge-bases/knowledge-bases";
import { Pipelines } from "./pages/pipelines/pipelines";
import { Flows } from "./pages/flows/flows";
import { Settings } from "./pages/settings/settings";
import { MainLayoutComponent } from "./shared/layout";

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        redirectTo: '/dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        component: Dashboard,
        data: { title: 'Dashboard', icon: 'layout-dashboard' }
      },
      {
        path: 'tools',
        component: Tools,
        data: { title: 'Tools', icon: 'wrench' }
      },
      {
        path: 'knowledge-bases',
        component: KnowledgeBases,
        data: { title: 'Knowledge Bases', icon: 'book-open' }
      },
      {
        path: 'pipelines',
        component: Pipelines,
        data: { title: 'Pipelines', icon: 'workflow' }
      },
      {
        path: 'flows',
        component: Flows,
        data: { title: 'Flows', icon: 'git-branch' }
      },
      {
        path: 'settings',
        component: Settings,
        data: { title: 'Settings', icon: 'settings' }
      }
    ]
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];
