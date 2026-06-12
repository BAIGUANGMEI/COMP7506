interface BackRouter {
  back: () => void;
  canGoBack: () => boolean;
  replace: (href: '/') => void;
}

export function goBackOrHome(router: BackRouter) {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace('/');
}
