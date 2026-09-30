<script>
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import { onMount } from 'svelte';

  export let data;
  export let form;

  $: userEmail = data?.user?.email ?? 'Client admin';

  let active = 'overview';
  let mobileOpen = false;
  let sidebarCollapsed = false; // New: Desktop collapse state
  let notice = '';
  let theme = 'dark';

  let messageBody = '';
  let sendingMessage = false;

  let projectNotifications = true;
  let billingNotifications = true;
  let messageNotifications = true;

  let showProjectModal = false;
  let showQuoteModal = false;

  let projectName = '';
  let projectDescription = '';
  let projectSubmitting = false;

  let quoteTitle = '';
  let quoteDetails = '';
  let quoteSubmitting = false;

  // Search State
  let searchQuery = '';
  let isSearching = false;

  // Notifications State
  let showNotifications = false;
  let notifications = [
    { id: 1, title: 'Workspace ready', desc: 'Your Origins client workspace has been securely provisioned.', time: '10m ago', unread: true },
    { id: 2, title: 'Action required', desc: 'Please update your notification preferences in settings.', time: '1h ago', unread: true }
  ];
  $: unreadCount = notifications.filter(n => n.unread).length;

  const nav = [
    ['overview', 'Overview', 'home'],
    ['projects', 'Projects', 'layers'],
    ['quotes', 'Quotes', 'circle-dashed'],
    ['invoices', 'Invoices', 'credit-card'],
    ['documents', 'Documents', 'file-text'],
    ['messages', 'Messages', 'message-circle']
  ];

  $: profile = data?.profile;
  $: organization = data?.organization;

  $: projects = data?.projects ?? [];
  $: quotes = data?.quotes ?? [];
  $: invoices = data?.invoices ?? [];
  $: docs = data?.documents ?? [];
  $: messages = data?.messages ?? [];

  $: displayName =
    profile?.fullName ||
    data?.user?.email?.split('@')[0] ||
    'Client';

  $: initials = displayName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  $: workspaceName =
    organization?.name || 'Client workspace';

  $: activeProjects =
    projects.filter(
      (project) => project.status !== 'complete'
    ).length;

  $: outstandingInvoices =
    invoices.filter((invoice) =>
      ['sent', 'overdue'].includes(invoice.status)
    );

  $: outstandingAmount =
    outstandingInvoices.reduce(
      (sum, invoice) =>
        sum + Number(invoice.amount || 0),
      0
    );

  $: latestMessages = messages.slice(0, 4);

  $: title =
    active === 'settings'
      ? 'Settings'
      : nav.find(([key]) => key === active)?.[1] ??
        'Overview';


  /*
   * =========================================================
   * SEARCH INDEXING LOGIC
   * =========================================================
   */

  // Combine all items into a searchable index
  $: searchIndex = [
    ...projects.map(p => ({ category: 'Project', title: p.name, id: p.code, action: () => select('projects') })),
    ...quotes.map(q => ({ category: 'Quote', title: q.title, id: q.reference, action: () => select('quotes') })),
    ...invoices.map(i => ({ category: 'Invoice', title: `Invoice ${i.reference}`, id: i.reference, action: () => select('invoices') })),
    ...docs.map(d => ({ category: 'Document', title: d.name, action: () => select('documents') }))
  ];

  // Reactively filter results based on query
  $: searchResults = searchQuery.trim() === '' 
    ? [] 
    : searchIndex.filter(item => 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (item.id && item.id.toLowerCase().includes(searchQuery.toLowerCase()))
      ).slice(0, 5);


  /*
   * =========================================================
   * INITIALIZATION
   * =========================================================
   */

  onMount(() => {
    loadPreferences();

    // Close popovers when clicking outside
    const handleClickOutside = (e) => {
      if (!e.target.closest('.search-wrapper')) isSearching = false;
      if (!e.target.closest('.notification-wrapper')) showNotifications = false;
    };
    document.addEventListener('click', handleClickOutside);

    return () => {
      window.clearTimeout(action.timeout);
      document.removeEventListener('click', handleClickOutside);
    };
  });


  /*
   * =========================================================
   * THEME
   * =========================================================
   */

  function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('origins-theme', theme);
  }


  /*
   * =========================================================
   * NAVIGATION & TOGGLES
   * =========================================================
   */

  function select(section) {
    active = section;
    mobileOpen = false;
    searchQuery = '';
    isSearching = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function toggleSidebar() {
    if (window.innerWidth > 900) {
      sidebarCollapsed = !sidebarCollapsed;
    } else {
      mobileOpen = !mobileOpen;
    }
  }

  function openNotifications() {
    showNotifications = !showNotifications;
    if (showNotifications) {
      // Mark all as read when opened
      notifications = notifications.map(n => ({ ...n, unread: false }));
    }
  }


  /*
   * =========================================================
   * TOAST
   * =========================================================
   */

  function action(message) {
    notice = message;
    window.clearTimeout(action.timeout);
    action.timeout = window.setTimeout(() => { notice = ''; }, 3200);
  }


  /*
   * =========================================================
   * FORMATTING
   * =========================================================
   */

  function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
  }

  function money(value, currency = 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(value || 0));
  }

  function statusLabel(value) {
    return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }


  /*
   * =========================================================
   * CSV EXPORT
   * =========================================================
   */

  function escapeCsv(value) {
    return `"${String(value ?? '').replaceAll('"', '""')}"`;
  }

  function exportInvoicesCsv() {
    if (!invoices.length) return action('There are no invoices to export yet.');

    const headers = ['Invoice', 'Issued', 'Due', 'Amount', 'Currency', 'Status'];
    const rows = invoices.map((invoice) => [
      invoice.reference, formatDate(invoice.issuedAt), formatDate(invoice.dueAt),
      invoice.amount, invoice.currency || 'USD', statusLabel(invoice.status)
    ]);

    const csv = [headers.map(escapeCsv).join(','), ...rows.map((row) => row.map(escapeCsv).join(','))].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `origins-invoices-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    action(`${invoices.length} invoice${invoices.length === 1 ? '' : 's'} exported successfully.`);
  }


  /*
   * =========================================================
   * MODALS (PROJECT & QUOTE)
   * =========================================================
   */

  function openProjectModal() { projectName = ''; projectDescription = ''; showProjectModal = true; }
  function closeProjectModal() { if (!projectSubmitting) showProjectModal = false; }
  function handleProjectSubmit() { if (!projectName.trim()) return action('Please enter a project name.'); projectSubmitting = true; }
  async function handleProjectResult({ update }) {
    projectSubmitting = false;
    const result = await update();
    if (result?.type === 'failure') return action(result?.data?.error || 'Unable to create the project request.');
    showProjectModal = false; projectName = ''; projectDescription = '';
    await invalidateAll(); active = 'projects'; action('Project request submitted successfully.');
  }

  function openQuoteModal() { quoteTitle = ''; quoteDetails = ''; showQuoteModal = true; }
  function closeQuoteModal() { if (!quoteSubmitting) showQuoteModal = false; }
  function handleQuoteSubmit() { if (!quoteTitle.trim()) return action('Please enter what you need a quote for.'); quoteSubmitting = true; }
  async function handleQuoteResult({ update }) {
    quoteSubmitting = false;
    const result = await update();
    if (result?.type === 'failure') return action(result?.data?.error || 'Unable to submit the quote request.');
    showQuoteModal = false; quoteTitle = ''; quoteDetails = '';
    await invalidateAll(); active = 'quotes'; action('Quote request submitted successfully.');
  }


  /*
   * =========================================================
   * MESSAGING
   * =========================================================
   */

  function scrollToComposer() {
    active = 'messages';
    requestAnimationFrame(() => {
      document.querySelector('#message-composer')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      document.querySelector('#message-input')?.focus();
    });
  }

  function handleMessageSubmit() { sendingMessage = true; }
  async function handleMessageResult({ update }) {
    sendingMessage = false;
    const result = await update();
    if (result?.type === 'failure') return action(result?.data?.error || 'Unable to send the message.');
    messageBody = ''; action('Message sent securely to the Origins team.');
  }


  /*
   * =========================================================
   * PREFERENCES
   * =========================================================
   */

  function loadPreferences() {
    const savedTheme = localStorage.getItem('origins-theme');
    if (savedTheme === 'light' || savedTheme === 'dark') theme = savedTheme;
    const savedProjects = localStorage.getItem('origins-notifications-projects');
    const savedBilling = localStorage.getItem('origins-notifications-billing');
    const savedMessages = localStorage.getItem('origins-notifications-messages');

    if (savedProjects !== null) projectNotifications = savedProjects === 'true';
    if (savedBilling !== null) billingNotifications = savedBilling === 'true';
    if (savedMessages !== null) messageNotifications = savedMessages === 'true';
    document.documentElement.dataset.theme = theme;
  }

  function saveNotificationPreference(key, value) {
    localStorage.setItem(key, String(value));
    action('Notification preferences updated.');
  }

  // --- SVG Icon Helper Function ---
  function getIconPath(name) {
    switch (name) {
      case 'home': return "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10";
      case 'layers': return "M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5";
      case 'circle-dashed': return "M8.56 2.75c1.11-.47 2.31-.75 3.56-.75 M19.25 12c0 1.25-.28 2.45-.75 3.56 M12 21.25c-1.25 0-2.45-.28-3.56-.75 M2.75 12c0-1.25.28-2.45.75-3.56 M2.75 12c0 .41.05.82.13 1.22 M5.04 17.58A9.03 9.03 0 0 0 8.56 20.4 M15.44 20.4a9.03 9.03 0 0 0 3.52-2.82 M21.25 12c0-.41-.05-.82-.13-1.22 M18.96 6.42A9.03 9.03 0 0 0 15.44 3.6 M8.56 3.6A9.03 9.03 0 0 0 5.04 6.42";
      case 'credit-card': return "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M2 10h20";
      case 'file-text': return "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8";
      case 'message-circle': return "M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z";
      case 'arrow-up-right': return "M7 17L17 7 M7 7h10v10";
      case 'chevron-right': return "M9 18l6-6-6-6";
      case 'chevron-down': return "M6 9l6 6 6-6";
      case 'search': return "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M21 21l-4.35-4.35";
      case 'sun': return "M12 1v2 M12 21v2 M4.22 4.22l1.42 1.42 M18.36 18.36l1.42 1.42 M1 12h2 M21 12h2 M4.22 19.78l1.42-1.42 M18.36 5.64l1.42-1.42 M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z";
      case 'moon': return "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z";
      case 'bell': return "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0";
      case 'check': return "M20 6L9 17l-5-5";
      case 'x': return "M18 6L6 18 M6 6l12 12";
      case 'log-out': return "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9";
      case 'menu': return "M3 12h18 M3 6h18 M3 18h18";
      case 'star': return "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";
      default: return "";
    }
  }
</script>

<svelte:head>
  <title>{title} · Origins Client Portal</title>
  <meta name="description" content="Origins Client Portal" />
</svelte:head>

<!-- Helper Component for SVGs -->
{#snippet Icon(name, size = 16, strokeWidth = 2, className = "")}
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} height={size} 
    viewBox="0 0 24 24" fill="none" 
    stroke="currentColor" stroke-width={strokeWidth} 
    stroke-linecap="round" stroke-linejoin="round"
    class={className}
  >
    <path d={getIconPath(name)} />
  </svg>
{/snippet}


<div class="portal-shell" class:sidebar-collapsed={sidebarCollapsed}>

  <!-- MOBILE BACKDROP -->
  <div class="mobile-backdrop" class:open={mobileOpen} role="presentation" onclick={() => (mobileOpen = false)}></div>

  <!-- =====================================================
       SIDEBAR
       ===================================================== -->

  <aside class="sidebar" class:open={mobileOpen}>

    <div class="brand">
      <img src="/images/origins-logo.png" alt="Origins" class="brand-logo" />
      <div class="brand-copy">
        <strong>ORIGINS</strong>
        <span>CLIENT PORTAL</span>
      </div>
    </div>

    <div class="workspace-switcher">
      <span class="eyebrow nav-text-content">WORKSPACE</span>
      <button type="button" onclick={() => action('Workspace switching will be available when multiple organisations are connected.')}>
        <span class="workspace-avatar">{initials}</span>
        <span class="workspace-name nav-text-content">
          <b>{workspaceName}</b>
          <small>Client workspace</small>
        </span>
        <span class="chevron nav-text-content">
          {@render Icon('chevron-down', 14)}
        </span>
      </button>
    </div>

    <nav class="portal-nav" aria-label="Portal navigation">
      <span class="nav-label nav-text-content">Workspace</span>
      {#each nav as item}
        <button class:active={active === item[0]} type="button" onclick={() => select(item[0])}>
          <span class="nav-icon">{@render Icon(item[2], 16)}</span>
          <span class="nav-text-content">{item[1]}</span>
          {#if item[0] === 'messages' && messages.length}
            <i class="nav-badge nav-text-content">{messages.length}</i>
          {/if}
        </button>
      {/each}
    </nav>

    <div class="sidebar-bottom">
      <div class="support-card">
        <span class="support-dot"></span>
        <div class="nav-text-content">
          <b>Origins team online</b>
          <small>Typical reply under 1 day</small>
        </div>
        <span class="support-live nav-text-content">LIVE</span>
      </div>

      <div class="user-row-wrap">
        <button class="user-row" type="button" onclick={() => select('settings')}>
          <span class="user-avatar">{initials}</span>
          <span class="user-details nav-text-content">
            <b>{displayName}</b>
            <small>{userEmail}</small>
          </span>
          <span class="user-chevron nav-text-content">
            {@render Icon('chevron-right', 14)}
          </span>
        </button>

        <form method="POST" action="?/logout">
          <button class="logout-button" type="submit" aria-label="Log out of Origins Client Portal">
            <span class="logout-icon">{@render Icon('log-out', 14)}</span>
            <span class="nav-text-content">Log out</span>
          </button>
        </form>
      </div>
    </div>
  </aside>


  <!-- =====================================================
       MAIN
       ===================================================== -->

  <main class="main">

    <!-- TOPBAR -->
    <header class="topbar">
      <!-- Universal Sidebar Toggle -->
      <button class="sidebar-toggle" type="button" aria-label="Toggle navigation" onclick={toggleSidebar}>
        {@render Icon('menu', 20)}
      </button>

      <div class="breadcrumbs">
        <span>{workspaceName}</span>
        <b>/</b>
        <strong>{title}</strong>
      </div>

      <div class="top-actions">
        
        <!-- Borderless Expanding Search Function -->
        <div class="search-wrapper" class:active={isSearching}>
          <span class="search-icon">{@render Icon('search', 16)}</span>
          <input 
            id="global-search"
            type="text" 
            placeholder="Search workspace..." 
            bind:value={searchQuery}
            onfocus={() => isSearching = true}
          />
          {#if isSearching && searchQuery}
            <div class="search-popover">
              <span class="popover-title">SEARCH RESULTS</span>
              {#each searchResults as result}
                <button class="search-result-item" type="button" onclick={result.action}>
                  <span class="result-category">{result.category}</span>
                  <span class="result-title">{result.title}</span>
                </button>
              {:else}
                <div class="no-results">No results found for "{searchQuery}"</div>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Animated Theme Toggle -->
        <button class="icon-button theme-button" type="button" aria-label="Toggle light and dark mode" onclick={toggleTheme}>
          <div class="theme-icon-wrapper" class:is-light={theme === 'light'}>
            {#if theme === 'dark'}
              {@render Icon('sun', 18)}
            {:else}
              {@render Icon('moon', 18)}
            {/if}
          </div>
        </button>

        <!-- Working Notifications Dropdown -->
        <div class="notification-wrapper relative">
          <button class="icon-button notification" type="button" aria-label="Notifications" onclick={openNotifications}>
            {@render Icon('bell', 18)}
            {#if unreadCount > 0}<i></i>{/if}
          </button>
          {#if showNotifications}
            <div class="notifications-popover">
              <div class="popover-head">
                <b>Notifications</b>
                {#if unreadCount > 0}
                  <span class="badge">{unreadCount} new</span>
                {/if}
              </div>
              <div class="popover-body">
                {#each notifications as note}
                  <div class="notification-item">
                    <div class="note-dot" class:unread={note.unread}></div>
                    <div>
                      <strong>{note.title}</strong>
                      <p>{note.desc}</p>
                      <small>{note.time}</small>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </div>

        <button class="top-avatar" type="button" aria-label="Open settings" onclick={() => select('settings')}>
          {initials}
        </button>

      </div>
    </header>

    <!-- TOAST -->
    {#if notice}
      <div class="toast" role="status">
        <span>{notice}</span>
        <span>{@render Icon('check', 14)}</span>
      </div>
    {/if}

    <div class="content">

      <!-- =================================================
           OVERVIEW
           ================================================= -->
      {#if active === 'overview'}
        <section class="page-head">
          <div>
            <span class="eyebrow live"><i></i> CLIENT WORKSPACE</span>
            <h1>Good afternoon, {displayName}.</h1>
            <p>Here’s the current picture across your Origins work.</p>
          </div>
          <button class="button primary" type="button" onclick={openProjectModal}>+ New request</button>
        </section>

        <section class="signal-grid">
          <article class="signal-card featured">
            <div class="signal-card-head">
              <span>ACCOUNT HEALTH</span><em>Good</em>
            </div>
            <div class="signal-value">—</div>
            <p>Delivery confidence will appear once work is assigned.</p>
            <div class="empty-meter">No delivery data yet</div>
          </article>

          <article class="signal-card">
            <div class="signal-card-head">
              <span>ACTIVE PROJECTS</span><em class="neutral">{activeProjects}</em>
            </div>
            <div class="signal-value">{String(activeProjects).padStart(2, '0')}</div>
            <p>{activeProjects === 0 ? 'No projects have been assigned yet' : 'Projects currently in delivery'}</p>
            <button class="card-link" type="button" onclick={() => select('projects')}>
              View projects <span class="ml-1">{@render Icon('arrow-up-right', 14)}</span>
            </button>
          </article>

          <article class="signal-card">
            <div class="signal-card-head">
              <span>OUTSTANDING</span><em class="warning">{outstandingInvoices.length} due</em>
            </div>
            <div class="signal-value">{money(outstandingAmount)}</div>
            <p>{outstandingInvoices.length ? 'Outstanding client invoices' : 'No outstanding invoices'}</p>
            <button class="card-link" type="button" onclick={() => select('invoices')}>
              View invoices <span class="ml-1">{@render Icon('arrow-up-right', 14)}</span>
            </button>
          </article>
        </section>

        <section class="section-grid">
          <article class="panel project-panel">
            <div class="panel-head">
              <div>
                <span class="eyebrow">DELIVERY</span>
                <h2>Active projects</h2>
              </div>
              <button class="text-button" type="button" onclick={() => select('projects')}>
                View all <span class="ml-1">{@render Icon('arrow-up-right', 14)}</span>
              </button>
            </div>

            {#if projects.length}
              {#each projects as project}
                <div class="project-row">
                  <div class="project-symbol">{project.code?.slice(-2) || 'PR'}</div>
                  <div class="project-main">
                    <div class="project-title">
                      <b>{project.name}</b>
                      <span class:review={project.status === 'review'}>{statusLabel(project.status)}</span>
                    </div>
                    <small>{project.code} · Lead {project.leadName || 'Origins team'}</small>
                    <div class="progress">
                      <i style={`width:${Math.min(100, Math.max(0, Number(project.progress || 0)))}%`}></i>
                    </div>
                  </div>
                  <div class="project-meta">
                    <strong>{project.progress || 0}%</strong>
                    <small>Due {formatDate(project.dueDate)}</small>
                  </div>
                </div>
              {/each}
            {:else}
              <div class="empty-state">
                <span class="empty-icon">{@render Icon('layers', 24)}</span>
                <h3>No projects yet</h3>
                <p>Your workspace is ready. Start a project request and the Origins team can begin planning it with you.</p>
                <button class="button secondary" type="button" onclick={openProjectModal}>
                  Start a project request <span class="ml-1">{@render Icon('arrow-up-right', 14)}</span>
                </button>
              </div>
            {/if}
          </article>

          <article class="panel">
            <div class="panel-head">
              <div>
                <span class="eyebrow">NEXT UP</span>
                <h2>Recent activity</h2>
              </div>
            </div>
            <div class="activity">
              {#if latestMessages.length}
                {#each latestMessages as message}
                  <div>
                    <span class="activity-dot flex items-center justify-center">{@render Icon('message-circle', 12)}</span>
                    <p>
                      <b>New message</b>
                      <small>{message.body?.slice(0, 90)} · {formatDate(message.createdAt)}</small>
                    </p>
                  </div>
                {/each}
              {:else}
                <div>
                  <span class="activity-dot done flex items-center justify-center">{@render Icon('check', 12)}</span>
                  <p>
                    <b>Your workspace is ready</b>
                    <small>Submit a project request, request a quote or message the Origins team to get started.</small>
                  </p>
                </div>
              {/if}
            </div>
          </article>
        </section>

        <section class="banner">
          <div>
            <span class="eyebrow">NEED SOMETHING?</span>
            <h2>Keep the next request simple.</h2>
            <p>Ask about delivery, scope, documents, billing or anything your team needs from Origins.</p>
          </div>
          <button class="button ghost" type="button" onclick={scrollToComposer}>
            Contact the team <span class="ml-1">{@render Icon('arrow-up-right', 14)}</span>
          </button>
        </section>


      <!-- =================================================
           PROJECTS
           ================================================= -->
      {:else if active === 'projects'}
        <section class="page-head">
          <div>
            <span class="eyebrow">DELIVERY</span>
            <h1>Projects</h1>
            <p>Live delivery status, milestones and project contacts.</p>
          </div>
          <button class="button primary" type="button" onclick={openProjectModal}>+ New project</button>
        </section>

        <section class="list-panel">
          {#if projects.length}
            {#each projects as project}
              <article class="detail-row">
                <div class="project-symbol large">{project.code?.slice(-2) || 'PR'}</div>
                <div class="detail-grow">
                  <div class="project-title">
                    <h3>{project.name}</h3>
                    <span class:review={project.status === 'review'}>{statusLabel(project.status)}</span>
                  </div>
                  <p>{project.code} · Delivery lead {project.leadName || 'Origins team'}</p>
                  <div class="progress">
                    <i style={`width:${Math.min(100, Math.max(0, Number(project.progress || 0)))}%`}></i>
                  </div>
                </div>
                <div class="detail-stat">
                  <strong>{project.progress || 0}%</strong><small>complete</small>
                </div>
                <div class="detail-stat">
                  <strong>{formatDate(project.dueDate)}</strong><small>target date</small>
                </div>
                <button class="row-action" type="button" onclick={() => action(`Project ${project.name} is currently available in your workspace.`)}>
                  Open <span class="ml-1">{@render Icon('arrow-up-right', 14)}</span>
                </button>
              </article>
            {/each}
          {:else}
            <div class="empty-state">
              <span class="empty-icon">{@render Icon('layers', 24)}</span>
              <h3>No projects yet</h3>
              <p>Start a project request and the Origins team can begin planning your work.</p>
              <button class="button secondary" type="button" onclick={openProjectModal}>
                New project request <span class="ml-1">{@render Icon('arrow-up-right', 14)}</span>
              </button>
            </div>
          {/if}
        </section>


      <!-- =================================================
           QUOTES
           ================================================= -->
      {:else if active === 'quotes'}
        <section class="page-head">
          <div>
            <span class="eyebrow">COMMERCIAL</span>
            <h1>Quotes</h1>
            <p>Review proposals, scope and approval status.</p>
          </div>
          <button class="button primary" type="button" onclick={openQuoteModal}>Request a quote</button>
        </section>

        <section class="list-panel">
          {#if quotes.length}
            {#each quotes as quote}
              <article class="detail-row">
                <div class="doc-icon">Q</div>
                <div class="detail-grow">
                  <div class="project-title">
                    <h3>{quote.title}</h3>
                    <span class:review={quote.status === 'sent'}>{statusLabel(quote.status)}</span>
                  </div>
                  <p>{quote.reference} · {quote.expiresAt ? `Expires ${formatDate(quote.expiresAt)}` : 'No expiry date'}</p>
                </div>
                <div class="detail-stat">
                  <strong>{money(quote.amount)}</strong><small>total</small>
                </div>
                <button class="row-action" type="button" onclick={() => action(`Quote ${quote.reference} is available in your workspace.`)}>
                  Open <span class="ml-1">{@render Icon('arrow-up-right', 14)}</span>
                </button>
              </article>
            {/each}
          {:else}
            <div class="empty-state">
              <span class="empty-icon">{@render Icon('circle-dashed', 24)}</span>
              <h3>No quotes yet</h3>
              <p>Request a quote and the Origins team can prepare the scope and commercial details.</p>
              <button class="button secondary" type="button" onclick={openQuoteModal}>
                Request a quote <span class="ml-1">{@render Icon('arrow-up-right', 14)}</span>
              </button>
            </div>
          {/if}
        </section>


      <!-- =================================================
           INVOICES
           ================================================= -->
      {:else if active === 'invoices'}
        <section class="page-head">
          <div>
            <span class="eyebrow">BILLING</span>
            <h1>Invoices</h1>
            <p>Payment history and outstanding balances.</p>
          </div>
          <button class="button secondary" type="button" onclick={exportInvoicesCsv}>
            Export CSV <span class="ml-1">{@render Icon('arrow-up-right', 14, 2, "rotate-90")}</span>
          </button>
        </section>

        <section class="billing-summary">
          <div>
            <span>Outstanding</span>
            <strong>{money(outstandingAmount)}</strong>
            <small>{outstandingInvoices.length ? `${outstandingInvoices.length} invoice${outstandingInvoices.length === 1 ? '' : 's'} due` : 'Nothing due'}</small>
          </div>
          <div>
            <span>Paid invoices</span>
            <strong>{invoices.filter((invoice) => invoice.status === 'paid').length}</strong>
            <small>Recorded in this workspace</small>
          </div>
          <div>
            <span>Account balance</span>
            <strong>$0.00</strong>
            <small>No credit or overpayment</small>
          </div>
        </section>

        <section class="list-panel invoice-list">
          <div class="table-head">
            <span>Invoice</span><span>Project</span><span>Issued</span><span>Due</span><span>Amount</span><span>Status</span>
          </div>
          {#if invoices.length}
            {#each invoices as invoice}
              <div class="invoice-row">
                <b>{invoice.reference}</b>
                <span>—</span>
                <span>{formatDate(invoice.issuedAt)}</span>
                <span>{formatDate(invoice.dueAt)}</span>
                <strong>{money(invoice.amount, invoice.currency)}</strong>
                <span class="status" class:paid={invoice.status === 'paid'}>{statusLabel(invoice.status)}</span>
                <button type="button" aria-label={`Open invoice ${invoice.reference}`} onclick={() => action(`Invoice ${invoice.reference} opened.`)}>
                  {@render Icon('arrow-up-right', 14)}
                </button>
              </div>
            {/each}
          {:else}
            <div class="empty-state">
              <span class="empty-icon">{@render Icon('credit-card', 24)}</span>
              <h3>No invoices yet</h3>
              <p>Billing records will appear here when Origins issues an invoice to your organization.</p>
            </div>
          {/if}
        </section>


      <!-- =================================================
           DOCUMENTS
           ================================================= -->
      {:else if active === 'documents'}
        <section class="page-head">
          <div>
            <span class="eyebrow">FILES</span>
            <h1>Documents</h1>
            <p>Project documents, reports and commercial records in one place.</p>
          </div>
          <button class="button primary" type="button" onclick={() => action('Document upload is the next storage workflow to connect.')}>
            Upload file
          </button>
        </section>

        <section class="document-grid">
          {#if docs.length}
            {#each docs as doc}
              <article class="document-card" role="button" tabindex="0" onclick={() => action(`Opening ${doc.name}`)} onkeydown={(e) => { if(e.key==='Enter' || e.key===' ') action(`Opening ${doc.name}`); }}>
                <div class="doc-top">
                  <span class="doc-icon flex items-center justify-center">{@render Icon('file-text', 16)}</span>
                  <span class="flex items-center gap-1">{doc.mimeType || 'FILE'} {@render Icon('arrow-up-right', 12)}</span>
                </div>
                <h3>{doc.name}</h3>
                <p>{doc.projectId ? 'Project document' : 'Workspace document'}</p>
                <small>{formatDate(doc.createdAt)}</small>
              </article>
            {/each}
          {:else}
            <div class="empty-state">
              <span class="empty-icon">{@render Icon('file-text', 24)}</span>
              <h3>No documents yet</h3>
              <p>Documents uploaded by Origins will appear here.</p>
            </div>
          {/if}
        </section>


      <!-- =================================================
           MESSAGES
           ================================================= -->
      {:else if active === 'messages'}
        <section class="page-head">
          <div>
            <span class="eyebrow">COMMUNICATION</span>
            <h1>Messages</h1>
            <p>Direct, private communication with the Origins team.</p>
          </div>
          <button class="button primary flex items-center gap-1" type="button" onclick={scrollToComposer}>
            <span>New message</span><span class="ml-1">{@render Icon('arrow-up-right', 14)}</span>
          </button>
        </section>

        <section class="messages-panel">
          <div class="message-list">
            <div class="messages-header">
              <div>
                <span class="eyebrow">SECURE CHANNEL</span>
                <h2>Origins team</h2>
              </div>
              <span class="secure-pill"><i></i> Encrypted workspace</span>
            </div>

            {#if messages.length}
              {#each messages as message, index}
                <article class:active={index === 0} class="message-item">
                  <span class="user-avatar">{message.sender?.fullName?.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase() || 'O'}</span>
                  <div class="message-content">
                    <div class="message-meta">
                      <div>
                        <b>{message.sender?.fullName || 'Origins team'}</b>
                        <small>{message.conversation?.subject || 'Workspace message'}</small>
                      </div>
                      <time>{formatDate(message.createdAt)}</time>
                    </div>
                    <p>{message.body}</p>
                  </div>
                </article>
              {/each}
            {:else}
              <div class="message-empty">
                <div class="empty-message-orb flex items-center justify-center">{@render Icon('message-circle', 24)}</div>
                <h3>Your conversation starts here</h3>
                <p>Send your Origins team a message about delivery, billing, documents, scope or anything else.</p>
                <button class="button secondary" type="button" onclick={scrollToComposer}>
                  Start conversation <span class="ml-1">{@render Icon('arrow-up-right', 14)}</span>
                </button>
              </div>
            {/if}
          </div>

          <div class="message-compose" id="message-composer">
            <div class="composer-heading">
              <div>
                <span class="eyebrow">QUICK REPLY</span>
                <h2>Write to Origins</h2>
              </div>
              <span class="composer-status"><i></i> Team available</span>
            </div>

            <form method="POST" action="?/sendMessage" use:enhance={() => { handleMessageSubmit(); return async ({ update }) => { await handleMessageResult({ update }); }; }}>
              <div class="composer-input">
                <textarea id="message-input" name="body" bind:value={messageBody} maxlength="4000" rows="6" required placeholder="Tell the Origins team what you need..."></textarea>
                <div class="composer-tools">
                  <span>{messageBody.length}/4000</span>
                  <span>Replies stay inside your secure workspace.</span>
                </div>
              </div>
              <div class="compose-actions">
                <small>Usually replies within one business day.</small>
                <button class="button primary" type="submit" disabled={sendingMessage || !messageBody.trim()}>
                  {#if sendingMessage}
                    <span class="button-spinner"></span> Sending…
                  {:else}
                    Send securely <span class="ml-1">{@render Icon('arrow-up-right', 14)}</span>
                  {/if}
                </button>
              </div>
            </form>
          </div>
        </section>


      <!-- =================================================
           SETTINGS
           ================================================= -->
      {:else if active === 'settings'}
        <section class="page-head">
          <div>
            <span class="eyebrow">ACCOUNT</span>
            <h1>Settings</h1>
            <p>Manage your Origins workspace profile and preferences.</p>
          </div>
        </section>

        <section class="settings-grid">
          <article class="panel settings-card">
            <div class="settings-card-heading">
              <div>
                <span class="eyebrow">PROFILE</span>
                <h2>Personal details</h2>
                <p>These details identify you inside the client workspace.</p>
              </div>
              <span class="settings-icon flex items-center justify-center">{@render Icon('star', 20)}</span>
            </div>

            <form method="POST" action="?/saveProfile" use:enhance class="settings-form">
              <label class="wide">
                <span>Name</span>
                <input name="name" value={displayName} autocomplete="name" required />
              </label>
              <label class="wide">
                <span>Email</span>
                <input value={userEmail} readonly />
                <small>Your login email is managed through your secure account.</small>
              </label>
              <label class="wide">
                <span>Role</span>
                <input value={profile?.role || 'client'} readonly />
              </label>
              <button class="button primary" type="submit">
                Save profile <span class="ml-1">{@render Icon('arrow-up-right', 14)}</span>
              </button>
            </form>
          </article>

          <article class="panel settings-card">
            <div class="settings-card-heading">
              <div>
                <span class="eyebrow">PREFERENCES</span>
                <h2>Notifications</h2>
                <p>Choose which workspace updates you want to receive.</p>
              </div>
              <span class="settings-icon flex items-center justify-center">{@render Icon('bell', 20)}</span>
            </div>

            <div class="preference-list">
              <label class="toggle-row">
                <span>
                  <b>Project updates</b>
                  <small>Milestones, risks and delivery notes</small>
                </span>
                <input type="checkbox" checked={projectNotifications} onchange={(e) => { projectNotifications = e.currentTarget.checked; saveNotificationPreference('origins-notifications-projects', projectNotifications); }} />
              </label>
              <label class="toggle-row">
                <span>
                  <b>Billing updates</b>
                  <small>Invoices, receipts and payment reminders</small>
                </span>
                <input type="checkbox" checked={billingNotifications} onchange={(e) => { billingNotifications = e.currentTarget.checked; saveNotificationPreference('origins-notifications-billing', billingNotifications); }} />
              </label>
              <label class="toggle-row">
                <span>
                  <b>Messages</b>
                  <small>Direct replies from your Origins team</small>
                </span>
                <input type="checkbox" checked={messageNotifications} onchange={(e) => { messageNotifications = e.currentTarget.checked; saveNotificationPreference('origins-notifications-messages', messageNotifications); }} />
              </label>
            </div>
          </article>
        </section>
      {/if}

    </div>
  </main>


  <!-- =====================================================
       NEW PROJECT MODAL
       ===================================================== -->
  {#if showProjectModal}
    <div class="modal-backdrop" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) closeProjectModal(); }}>
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="project-modal-title">
        <div class="modal-head">
          <div>
            <span class="eyebrow">NEW REQUEST</span>
            <h2 id="project-modal-title">Start a project</h2>
            <p>Tell the Origins team what you would like to create.</p>
          </div>
          <button class="modal-close flex items-center justify-center" type="button" aria-label="Close" onclick={closeProjectModal}>
            {@render Icon('x', 20)}
          </button>
        </div>

        <form method="POST" action="?/createProject" use:enhance={() => { handleProjectSubmit(); return async ({ update }) => { await handleProjectResult({ update }); }; }}>
          <label class="modal-field">
            <span>Project name</span>
            <input name="name" bind:value={projectName} maxlength="160" required autofocus placeholder="e.g. Website redesign" />
          </label>
          <label class="modal-field">
            <span>Project brief</span>
            <textarea name="description" bind:value={projectDescription} maxlength="4000" rows="6" placeholder="Tell the Origins team about the project, goals, scope or anything important..."></textarea>
          </label>
          <div class="modal-note">
            <span class="flex items-center justify-center">{@render Icon('star', 14)}</span>
            <p>This creates a project request in your workspace. The Origins team can then review the request and continue the planning process.</p>
          </div>
          <div class="modal-actions">
            <button class="button secondary" type="button" onclick={closeProjectModal} disabled={projectSubmitting}>Cancel</button>
            <button class="button primary" type="submit" disabled={projectSubmitting || !projectName.trim()}>
              {#if projectSubmitting} <span class="button-spinner"></span> Submitting… {:else} Submit request <span class="ml-1">{@render Icon('arrow-up-right', 14)}</span> {/if}
            </button>
          </div>
        </form>
      </section>
    </div>
  {/if}


  <!-- =====================================================
       QUOTE MODAL
       ===================================================== -->
  {#if showQuoteModal}
    <div class="modal-backdrop" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) closeQuoteModal(); }}>
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="quote-modal-title">
        <div class="modal-head">
          <div>
            <span class="eyebrow">COMMERCIAL</span>
            <h2 id="quote-modal-title">Request a quote</h2>
            <p>Give the Origins team enough context to prepare your request.</p>
          </div>
          <button class="modal-close flex items-center justify-center" type="button" aria-label="Close" onclick={closeQuoteModal}>
            {@render Icon('x', 20)}
          </button>
        </div>

        <form method="POST" action="?/requestQuote" use:enhance={() => { handleQuoteSubmit(); return async ({ update }) => { await handleQuoteResult({ update }); }; }}>
          <label class="modal-field">
            <span>What do you need a quote for?</span>
            <input name="title" bind:value={quoteTitle} maxlength="200" required autofocus placeholder="e.g. Brand identity package" />
          </label>
          <label class="modal-field">
            <span>Details</span>
            <textarea name="details" bind:value={quoteDetails} maxlength="4000" rows="6" placeholder="Describe the scope, deliverables, timing or other requirements..."></textarea>
          </label>
          <div class="modal-note">
            <span class="font-bold font-serif text-[16px]">$</span>
            <p>You do not need to enter an amount. The Origins team will review the request and prepare the commercial details.</p>
          </div>
          <div class="modal-actions">
            <button class="button secondary" type="button" onclick={closeQuoteModal} disabled={quoteSubmitting}>Cancel</button>
            <button class="button primary" type="submit" disabled={quoteSubmitting || !quoteTitle.trim()}>
              {#if quoteSubmitting} <span class="button-spinner"></span> Sending… {:else} Request quote <span class="ml-1">{@render Icon('arrow-up-right', 14)}</span> {/if}
            </button>
          </div>
        </form>
      </section>
    </div>
  {/if}

</div>


<style>
  /* 
   * =========================================================
   * PORTAL SHELL & COLLAPSIBLE SIDEBAR LOGIC
   * =========================================================
   */
  .portal-shell {
    min-height: 100vh;
    display: grid;
    grid-template-columns: var(--sidebar-width) minmax(0, 1fr);
    transition: grid-template-columns 0.4s var(--ease-spring-smooth);
    will-change: grid-template-columns;
  }

  /* Desktop Collapse State */
  .portal-shell.sidebar-collapsed {
    --sidebar-width: 76px;
  }

  /* Hide text and non-icon elements when collapsed */
  .sidebar-collapsed .nav-text-content,
  .sidebar-collapsed .brand-copy {
    display: none;
    opacity: 0;
  }

  /* Center the icons and structural elements when collapsed */
  .sidebar-collapsed .brand { justify-content: center; padding: 2px 0 28px; }
  .sidebar-collapsed .workspace-switcher button { justify-content: center; padding: 9px 0; }
  .sidebar-collapsed .workspace-switcher .workspace-avatar { margin: 0; }
  .sidebar-collapsed .portal-nav button { justify-content: center; padding: 12px 0; }
  .sidebar-collapsed .portal-nav button .nav-icon { margin: 0; }
  .sidebar-collapsed .support-card { justify-content: center; padding: 13px 0; }
  .sidebar-collapsed .support-card .support-dot { margin: 0; }
  .sidebar-collapsed .user-row { justify-content: center; grid-template-columns: 1fr; padding: 7px 0; }
  .sidebar-collapsed .user-row .user-avatar { margin: 0; }
  .sidebar-collapsed .logout-button { justify-content: center; padding: 0; }

  /* 
   * =========================================================
   * TOPBAR & TOGGLE STYLES
   * =========================================================
   */
  .sidebar-toggle {
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--surface);
    color: var(--muted);
    cursor: pointer;
    transition: transform 0.2s var(--ease-apple), background 0.2s var(--ease-apple);
  }
  .sidebar-toggle:hover { background: var(--surface-hover); color: var(--text); }
  .sidebar-toggle:active { transform: scale(0.92); }

  @media (max-width: 900px) {
    .portal-shell.sidebar-collapsed { --sidebar-width: 258px; } /* Reset for mobile drawer */
  }

  /* 
   * =========================================================
   * BORDERLESS SEARCH STYLES
   * =========================================================
   */
  .search-wrapper {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--surface-soft);
    border-radius: 10px;
    padding: 0 12px;
    height: 38px;
    position: relative;
    transition: background 0.3s var(--ease-apple), box-shadow 0.3s var(--ease-apple);
  }
  .search-wrapper.active {
    background: var(--surface);
    box-shadow: 0 0 0 3px var(--accent-faint);
  }
  .search-icon {
    color: var(--muted);
    display: flex;
    align-items: center;
  }
  .search-wrapper input {
    border: none; /* Removing border as requested */
    background: transparent;
    outline: none;
    color: var(--text);
    font-size: 13px;
    width: 180px;
    transition: width 0.4s var(--ease-spring-smooth);
  }
  .search-wrapper input:focus {
    width: 260px;
  }
  .search-wrapper input::placeholder {
    color: var(--dim);
  }
  .search-popover {
    position: absolute;
    top: calc(100% + 12px);
    right: 0;
    width: 320px;
    background: var(--surface-hover);
    border: 1px solid var(--border-strong);
    border-radius: 16px;
    box-shadow: var(--shadow-lg);
    padding: 8px;
    z-index: 50;
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    animation: fadeInDrop 0.4s var(--ease-spring-smooth) forwards;
  }
  .popover-title {
    display: block;
    padding: 8px 12px;
    font-size: 9px;
    font-weight: 700;
    color: var(--dim);
    letter-spacing: 0.1em;
  }
  .search-result-item {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 10px 12px;
    width: 100%;
    border: none;
    border-radius: 10px;
    background: transparent;
    cursor: pointer;
    transition: background 0.2s var(--ease-apple);
  }
  .search-result-item:hover {
    background: var(--surface-soft);
  }
  .result-category {
    font-size: 9px;
    color: var(--accent);
    font-weight: 700;
    text-transform: uppercase;
  }
  .result-title {
    font-size: 13px;
    color: var(--text);
    font-weight: 500;
    margin-top: 2px;
  }
  .no-results {
    padding: 16px 12px;
    text-align: center;
    color: var(--muted);
    font-size: 12px;
  }

  /* 
   * =========================================================
   * NOTIFICATIONS POPOVER
   * =========================================================
   */
  .notifications-popover {
    position: absolute;
    top: calc(100% + 12px);
    right: 0;
    width: 340px;
    background: var(--surface-hover);
    border: 1px solid var(--border-strong);
    border-radius: 16px;
    box-shadow: var(--shadow-lg);
    z-index: 50;
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    animation: fadeInDrop 0.4s var(--ease-spring-smooth) forwards;
    overflow: hidden;
  }
  .popover-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-soft);
  }
  .popover-head b { font-size: 14px; color: var(--text); }
  .popover-head .badge {
    background: var(--accent-faint);
    color: var(--accent);
    font-size: 10px;
    font-weight: 700;
    padding: 4px 8px;
    border-radius: 12px;
  }
  .popover-body {
    max-height: 400px;
    overflow-y: auto;
  }
  .notification-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-soft);
    background: transparent;
    transition: background 0.2s var(--ease-apple);
  }
  .notification-item:hover { background: var(--surface-soft); }
  .notification-item:last-child { border-bottom: none; }
  .note-dot {
    width: 8px; height: 8px; flex: 0 0 8px;
    margin-top: 5px; border-radius: 50%;
    background: transparent;
  }
  .note-dot.unread { background: var(--accent); box-shadow: 0 0 8px rgba(0,212,126,0.4); }
  .notification-item strong { display: block; font-size: 13px; color: var(--text); font-weight: 600; margin-bottom: 4px; }
  .notification-item p { margin: 0; font-size: 12px; color: var(--muted); line-height: 1.5; }
  .notification-item small { display: block; margin-top: 6px; font-size: 10px; color: var(--dim); }

  @keyframes fadeInDrop {
    from { opacity: 0; transform: translateY(-10px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  /* 
   * =========================================================
   * THEME TOGGLE ANIMATION
   * =========================================================
   */
  .theme-icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.6s var(--ease-spring-smooth);
  }
  .theme-icon-wrapper.is-light {
    transform: rotate(180deg);
  }

  /* Modal updates */
  .modal-backdrop {
    position: fixed; inset: 0; z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 24px;
    background: rgba(0, 0, 0, 0.45); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
    animation: fadeIn var(--duration-fast) var(--ease-out) forwards;
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

  .modal {
    width: min(620px, 100%); max-height: calc(100vh - 48px); overflow-y: auto; padding: 32px;
    border: 1px solid var(--border-strong); border-radius: var(--radius-xl); background: var(--bg); box-shadow: var(--shadow-lg);
    animation: modalRise 0.5s var(--ease-spring) forwards;
  }
  @keyframes modalRise { from { opacity: 0; transform: translateY(30px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }

  .modal-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; margin-bottom: 28px; }
  .modal-head h2 { margin: 7px 0 8px; font-size: 30px; line-height: 1.1; color: var(--text); }
  .modal-head p { max-width: 470px; margin: 0; color: var(--muted); line-height: 1.65; }

  .modal-close { width: 40px; height: 40px; flex: 0 0 40px; border: 1px solid var(--border); border-radius: 50%; background: var(--surface); color: var(--muted); cursor: pointer; transition: transform 0.2s ease, background 0.2s ease, color 0.2s ease; }
  .modal-close:hover { transform: rotate(90deg); background: var(--surface-hover); color: var(--text); }

  .modal-field { display: block; margin-bottom: 20px; }
  .modal-field > span { display: block; margin-bottom: 9px; color: var(--text-soft); font-size: 13px; font-weight: 600; letter-spacing: 0.02em; }
  .modal-field input, .modal-field textarea { width: 100%; box-sizing: border-box; border: 1px solid var(--border); border-radius: 14px; outline: none; background: var(--input-bg); color: var(--text); font: inherit; transition: border-color 0.2s var(--ease-out), background 0.2s var(--ease-out), box-shadow 0.2s var(--ease-out); }
  .modal-field input { min-height: 52px; padding: 0 16px; }
  .modal-field textarea { min-height: 145px; padding: 15px 16px; resize: vertical; line-height: 1.6; }
  .modal-field input::placeholder, .modal-field textarea::placeholder { color: var(--dim); }
  .modal-field input:focus, .modal-field textarea:focus { border-color: var(--accent); background: var(--surface); box-shadow: 0 0 0 4px var(--accent-faint); }

  .modal-note { display: flex; gap: 12px; align-items: flex-start; margin: 22px 0; padding: 15px 16px; border: 1px solid var(--border); border-radius: 14px; background: var(--surface-soft); }
  .modal-note > span { display: grid; width: 27px; height: 27px; flex: 0 0 27px; place-items: center; border-radius: 50%; background: var(--accent-faint); color: var(--accent); }
  .modal-note p { margin: 0; color: var(--muted); font-size: 13px; line-height: 1.65; }

  .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 26px; }
  .button-spinner { display: inline-block; width: 14px; height: 14px; margin-right: 8px; vertical-align: -2px; border: 2px solid currentColor; border-top-color: transparent; border-radius: 50%; animation: origins-spin 0.7s linear infinite; }
  @keyframes origins-spin { to { transform: rotate(360deg); } }

  @media (max-width: 640px) {
    .modal-backdrop { align-items: flex-end; padding: 0; }
    .modal { max-height: 92vh; padding: 24px 20px; border-radius: 24px 24px 0 0; }
    .modal-head h2 { font-size: 26px; }
    .modal-actions { flex-direction: column-reverse; }
    .modal-actions .button { width: 100%; }
    .search-wrapper input { width: 120px; }
    .search-wrapper input:focus { width: 180px; }
    .search-popover { width: 280px; right: -40px; }
  }
</style>
