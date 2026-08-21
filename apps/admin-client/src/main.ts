import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createApp } from "vue";
import App from "./App.vue";
import "./assets/main.css";
import { i18n } from "./i18n/i18n";
import { router } from "./router/router";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

createApp(App)
  .use(i18n)
  .use(router)
  .use(VueQueryPlugin, { queryClient })
  .mount("#app");
