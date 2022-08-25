import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router'


const routes: Array<RouteRecordRaw> = [
  {
    path: "/",
    redirect: "/login"
  }, 
  {
    path: '/login',
    name: 'login',
    component: () => import( '../views/LoginView.vue')
  },
  {
    path: '/cfr',
    name: 'cfr',
    component: () => import( '../views/CfrView.vue')
  }, 
  {
    path: '/manager',
    name: 'manager',
    component: () => import('../views/ManagerView.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
