import { Routes } from "@angular/router";
import { Dashboard } from "./pages/dashboard/dashboard";
import { Tools } from "./pages/tools/tools";
import { Models } from "./pages/models/models";
import { KnowledgeBases } from "./pages/knowledge-bases/knowledge-bases";
import { CreateKB } from "./pages/create-kb/create-kb";
import { Pipelines } from "./pages/pipelines/pipelines";
import { CreatePipeline } from "./pages/create-pipeline/create-pipeline";
import { Flows } from "./pages/flows/flows";
import { Settings } from "./pages/settings/settings";
import { MainLayout, TabsLayout } from "./shared/layout";

export const routes: Routes = [
  {
    path: '',
    component: MainLayout,
    children: [
      {
        path: '',
        component: TabsLayout,
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
            path: 'models',
            component: Models,
            data: { title: 'Models', icon: 'cpu' }
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
          }
        ]
      },
      {
        path: 'settings',
        component: Settings
      },
      {
        path: 'create-kb',
        component: CreateKB
      },
      {
        path: 'create-pipeline',
        component: CreatePipeline
      }
    ]
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];
