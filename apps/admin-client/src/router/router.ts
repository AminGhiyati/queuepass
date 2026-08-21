import { createRouter, createWebHistory } from "vue-router";
import { resolveRouteAccess } from "@/router/resolveRouteAccess";
import LoginPage from "@/pages/LoginPage.vue";
import PayoutsPage from "@/pages/PayoutsPage.vue";
import PlatformEventsPage from "@/pages/PlatformEventsPage.vue";
import PlatformOrdersPage from "@/pages/PlatformOrdersPage.vue";
import RevenuePage from "@/pages/RevenuePage.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "revenue", component: RevenuePage },
    { path: "/events", name: "events", component: PlatformEventsPage },
    { path: "/orders", name: "orders", component: PlatformOrdersPage },
    { path: "/payouts", name: "payouts", component: PayoutsPage },
    { path: "/login", name: "login", component: LoginPage },
  ],
});

router.beforeEach(resolveRouteAccess);
