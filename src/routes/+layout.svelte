<script>
  import { onMount } from 'svelte';
  import '../app.css';

  // Apply the same persisted theme on every route, including auth and developer pages.
  onMount(() => {
    try {
      const saved = localStorage.getItem('origins-theme');
      const theme = saved === 'light' || saved === 'dark' ? saved : 'dark';
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
    } catch (error) {
      document.documentElement.dataset.theme = 'dark';
      document.documentElement.style.colorScheme = 'dark';
    }
  });
</script>

<slot />
