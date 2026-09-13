declare module '#app' {
  interface NuxtApp {
    $axios: {
      get: <T = any>(url: string, config?: any) => Promise<{ data: T; status: number }>
      post: <T = any>(url: string, data?: any, config?: any) => Promise<{ data: T; status: number }>
      delete: <T = any>(url: string, config?: any) => Promise<{ data: T; status: number }>
    }
  }
}

export {}
