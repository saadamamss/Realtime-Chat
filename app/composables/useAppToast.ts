export function useAppToast() {
  const toast = useToast();

  return {
    success: ({
      title,
      description,
    }: {
      title: string;
      description?: string;
    }) => {
      toast.add({
        title,
        description,
        color: "success",
        icon: "ph-check-circle",
      });
    },
    error: ({
      title,
      description,
    }: {
      title: string;
      description?: string;
    }) => {
      toast.add({
        title,
        description,
        color: "error",
        icon: "ph-warning-circle",
      });
    },
    warning: ({
      title,
      description,
    }: {
      title: string;
      description?: string;
    }) => {
      toast.add({ title, description, color: "warning", icon: "ph-warning" });
    },
    info: ({ title, description }: { title: string; description?: string }) => {
      toast.add({ title, description, color: "info", icon: "ph-info" });
    },
  };
}
