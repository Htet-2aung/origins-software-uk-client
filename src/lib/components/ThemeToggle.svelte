<script>
  import { onMount } from 'svelte';

  let theme = 'dark';

  onMount(() => {
    const saved = localStorage.getItem('origins-portal-theme')
      ?? localStorage.getItem('origins-developer-theme')
      ?? localStorage.getItem('origins-theme');
    theme = saved === 'light' || saved === 'dark'
      ? saved
      : document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    applyTheme();
  });

  function applyTheme() {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem('origins-portal-theme', theme);
  }

  function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
    applyTheme();
  }
</script>

<button
  class="shared-theme-toggle"
  type="button"
  aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
  title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
  onclick={toggleTheme}
>
  <span aria-hidden="true">{theme === 'dark' ? '☼' : '☾'}</span>
  <span>{theme === 'dark' ? 'Light appearance' : 'Dark appearance'}</span>
</button>

<style>
  .shared-theme-toggle {
    position: absolute;
    top: 38px;
    right: clamp(20px, 4vw, 58px);
    z-index: 5;
    display: inline-flex;
    align-items: center;
    gap: 9px;
    padding: 9px 12px;
    border: 1px solid rgba(255,255,255,.16);
    border-radius: 999px;
    background: rgba(255,255,255,.08);
    color: rgba(255,255,255,.82);
    font: 600 10px Inter, sans-serif;
    cursor: pointer;
    box-shadow: inset 0 1px rgba(255,255,255,.16), 0 8px 24px rgba(0,0,0,.12);
    backdrop-filter: blur(22px) saturate(165%);
    -webkit-backdrop-filter: blur(22px) saturate(165%);
    transition: transform .2s ease, background .2s ease, border-color .2s ease;
  }

  .shared-theme-toggle span:first-child { font-size: 15px; }
  .shared-theme-toggle:hover {
    transform: translateY(-1px);
    background: rgba(255,255,255,.15);
    border-color: rgba(255,255,255,.28);
  }

  :global(:root[data-theme='light']) .shared-theme-toggle {
    border-color: rgba(255,255,255,.96);
    background: rgba(255,255,255,.76);
    color: #46566b;
    box-shadow: inset 0 1px #fff, 0 8px 24px rgba(39,57,74,.08);
  }

  :global(:root[data-theme='light']) .shared-theme-toggle:hover {
    background: rgba(255,255,255,.96);
    border-color: #d7e1e8;
  }

  @media (max-width: 560px) {
    .shared-theme-toggle { top: 22px; right: 18px; padding: 8px 10px; }
    .shared-theme-toggle span:last-child { display: none; }
  }

  @media (prefers-reduced-transparency: reduce) {
    .shared-theme-toggle { backdrop-filter: none; -webkit-backdrop-filter: none; }
  }
</style>
