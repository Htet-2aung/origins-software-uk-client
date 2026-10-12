<script>
  import { onMount } from 'svelte';
  import '../app.css';

  // Apply the same persisted theme on every route, including auth and developer pages.
  onMount(() => {
    const sharedTheme = localStorage.getItem('origins-portal-theme');
    const previousTheme = localStorage.getItem('origins-developer-theme') ?? localStorage.getItem('origins-theme');
    const theme = sharedTheme === 'light' || sharedTheme === 'dark'
      ? sharedTheme
      : previousTheme === 'light' || previousTheme === 'dark'
        ? previousTheme
        : 'dark';
    localStorage.setItem('origins-portal-theme', theme);
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  });
</script>

<slot />
