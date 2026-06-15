export const useToast = () => {
  const Toast = useToast();

  const success = ({
    title,
    description,
  }: {
    title: string;
    description?: string;
  }) => {
    Toast.add({
      title,
      description,
      color: "success",
      icon: "ph-check-circle",
    });
  };

  const error = ({
    title,
    description,
  }: {
    title: string;
    description?: string;
  }) => {
    Toast.add({
      title,
      description,
      color: "error",
      icon: "ph-warning-circle",
    });
  };

  const warning = ({
    title,
    description,
  }: {
    title: string;
    description?: string;
  }) => {
    Toast.add({
      title,
      description,
      color: "warning",
      icon: "ph-warning",
    });
  };
  const info = ({
    title,
    description,
  }: {
    title: string;
    description?: string;
  }) => {
    Toast.add({
      title,
      description,
      color: "info",
      icon: "ph-info",
    });
  };

  return {
    success,
    error,
    warning,
    info,
  };
};
