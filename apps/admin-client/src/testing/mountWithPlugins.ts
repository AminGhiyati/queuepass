import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { mount, type ComponentMountingOptions } from "@vue/test-utils";
import type { Component } from "vue";
import { i18n } from "@/i18n/i18n";

export function mountWithPlugins<MountedComponent extends Component>(
  component: MountedComponent,
  options: ComponentMountingOptions<MountedComponent> = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return mount(component, {
    ...options,
    global: {
      plugins: [i18n, [VueQueryPlugin, { queryClient }]],
      components: {
        RouterLink: { name: "RouterLink", props: ["to"], template: "<a><slot /></a>" },
      },
      ...options.global,
    },
  });
}
