import { createRouter, createWebHistory } from "vue-router";
import { resolveRouteAccess } from "@/router/resolveRouteAccess";
import AccountSettingsPage from "@/pages/AccountSettingsPage.vue";
import AttendeesPage from "@/pages/AttendeesPage.vue";
import BecomeOrganizerPage from "@/pages/BecomeOrganizerPage.vue";
import CheckoutPage from "@/pages/CheckoutPage.vue";
import EventDetailPage from "@/pages/EventDetailPage.vue";
import EventFormPage from "@/pages/EventFormPage.vue";
import EventListPage from "@/pages/EventListPage.vue";
import LandingPage from "@/pages/LandingPage.vue";
import LoginPage from "@/pages/LoginPage.vue";
import MyTicketsPage from "@/pages/MyTicketsPage.vue";
import OrderStatusPage from "@/pages/OrderStatusPage.vue";
import OrganizerEventsPage from "@/pages/OrganizerEventsPage.vue";
import PastEventsPage from "@/pages/PastEventsPage.vue";
import PastTicketsPage from "@/pages/PastTicketsPage.vue";
import RegisterPage from "@/pages/RegisterPage.vue";
import ScannerPage from "@/pages/ScannerPage.vue";
import TicketDetailPage from "@/pages/TicketDetailPage.vue";

declare module "vue-router" {
  interface RouteMeta {
    isPublic?: boolean;
    isGuestOnly?: boolean;
    requiresOrganizer?: boolean;
    isOrganizerOnboarding?: boolean;
  }
}

const organizerRoute = { requiresOrganizer: true };

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "landing", component: LandingPage, meta: { isPublic: true } },
    { path: "/events", name: "events", component: EventListPage, meta: { isPublic: true } },
    {
      path: "/events/:eventId",
      name: "eventDetail",
      component: EventDetailPage,
      meta: { isPublic: true },
    },
    { path: "/events/:eventId/checkout", name: "checkout", component: CheckoutPage },
    { path: "/orders/:orderId", name: "orderStatus", component: OrderStatusPage },
    { path: "/my-tickets", name: "myTickets", component: MyTicketsPage },
    { path: "/my-tickets/past", name: "pastTickets", component: PastTicketsPage },
    { path: "/my-tickets/:ticketId", name: "ticketDetail", component: TicketDetailPage },
    {
      path: "/become-organizer",
      name: "becomeOrganizer",
      component: BecomeOrganizerPage,
      meta: { isOrganizerOnboarding: true },
    },
    { path: "/login", name: "login", component: LoginPage, meta: { isGuestOnly: true } },
    { path: "/register", name: "register", component: RegisterPage, meta: { isGuestOnly: true } },
    {
      path: "/organizer",
      name: "organizerEvents",
      component: OrganizerEventsPage,
      meta: organizerRoute,
    },
    {
      path: "/organizer/account",
      name: "accountSettings",
      component: AccountSettingsPage,
      meta: organizerRoute,
    },
    {
      path: "/organizer/events/past",
      name: "pastEvents",
      component: PastEventsPage,
      meta: organizerRoute,
    },
    {
      path: "/organizer/events/new",
      name: "eventCreate",
      component: EventFormPage,
      meta: organizerRoute,
    },
    {
      path: "/organizer/events/:eventId/edit",
      name: "eventEdit",
      component: EventFormPage,
      meta: organizerRoute,
    },
    {
      path: "/organizer/events/:eventId/attendees",
      name: "eventAttendees",
      component: AttendeesPage,
      meta: organizerRoute,
    },
    {
      path: "/organizer/events/:eventId/scan",
      name: "eventScanner",
      component: ScannerPage,
      meta: organizerRoute,
    },
  ],
});

router.beforeEach(resolveRouteAccess);
