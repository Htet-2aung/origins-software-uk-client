<script>
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import { onMount } from 'svelte';

  export let data;
  export let form;

  $: userEmail = data?.user?.email ?? 'Client admin';

  let active = 'overview';
  let mobileOpen = false;
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

  const nav = [
    ['overview', 'Overview', '⌂'],
    ['projects', 'Projects', '◫'],
    ['quotes', 'Quotes', '◌'],
    ['invoices', 'Invoices', '◇'],
    ['documents', 'Documents', '□'],
    ['messages', 'Messages', '◒']
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
   * INITIALIZATION
   * =========================================================
   */

  onMount(() => {
    loadPreferences();

    return () => {
      window.clearTimeout(action.timeout);
    };
  });


  /*
   * =========================================================
   * THEME
   * =========================================================
   */

  function toggleTheme() {
    theme =
      theme === 'dark'
        ? 'light'
        : 'dark';

    document.documentElement.dataset.theme =
      theme;

    localStorage.setItem(
      'origins-theme',
      theme
    );
  }


  /*
   * =========================================================
   * NAVIGATION
   * =========================================================
   */

  function select(section) {
    active = section;
    mobileOpen = false;

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }


  /*
   * =========================================================
   * TOAST
   * =========================================================
   */

  function action(message) {
    notice = message;

    window.clearTimeout(action.timeout);

    action.timeout =
      window.setTimeout(() => {
        notice = '';
      }, 3200);
  }


  /*
   * =========================================================
   * FORMATTING
   * =========================================================
   */

  function formatDate(value) {
    if (!value) return '—';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return new Intl.DateTimeFormat(
      'en',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }
    ).format(date);
  }


  function money(
    value,
    currency = 'USD'
  ) {
    return new Intl.NumberFormat(
      'en-US',
      {
        style: 'currency',
        currency,
        maximumFractionDigits: 0
      }
    ).format(
      Number(value || 0)
    );
  }


  function statusLabel(value) {
    return String(value || '')
      .replaceAll('_', ' ')
      .replace(
        /\b\w/g,
        (letter) =>
          letter.toUpperCase()
      );
  }


  /*
   * =========================================================
   * CSV EXPORT
   * =========================================================
   */

  function escapeCsv(value) {
    const stringValue =
      String(value ?? '');

    return `"${stringValue.replaceAll(
      '"',
      '""'
    )}"`;
  }


  function exportInvoicesCsv() {
    if (!invoices.length) {
      action(
        'There are no invoices to export yet.'
      );

      return;
    }

    const headers = [
      'Invoice',
      'Issued',
      'Due',
      'Amount',
      'Currency',
      'Status'
    ];

    const rows =
      invoices.map((invoice) => [
        invoice.reference,
        formatDate(invoice.issuedAt),
        formatDate(invoice.dueAt),
        invoice.amount,
        invoice.currency || 'USD',
        statusLabel(
          invoice.status
        )
      ]);

    const csv = [
      headers
        .map(escapeCsv)
        .join(','),

      ...rows.map((row) =>
        row
          .map(escapeCsv)
          .join(',')
      )
    ].join('\r\n');

    const blob = new Blob(
      [csv],
      {
        type:
          'text/csv;charset=utf-8;'
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement('a');

    link.href = url;

    link.download =
      `origins-invoices-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);

    action(
      `${invoices.length} invoice${
        invoices.length === 1
          ? ''
          : 's'
      } exported successfully.`
    );
  }


  /*
   * =========================================================
   * PROJECT REQUEST
   * =========================================================
   */

  function openProjectModal() {
    projectName = '';
    projectDescription = '';

    showProjectModal = true;
  }


  function closeProjectModal() {
    if (projectSubmitting) return;

    showProjectModal = false;
  }


  function handleProjectSubmit() {
    if (!projectName.trim()) {
      action(
        'Please enter a project name.'
      );

      return;
    }

    projectSubmitting = true;
  }


  async function handleProjectResult({
    update
  }) {
    projectSubmitting = false;

    const result = await update();

    /*
     * SvelteKit updates the form result.
     * If the action returned an error, keep
     * the modal open.
     */

    if (result?.type === 'failure') {
      action(
        result?.data?.error ||
          'Unable to create the project request.'
      );

      return;
    }

    showProjectModal = false;

    projectName = '';
    projectDescription = '';

    await invalidateAll();

    active = 'projects';

    action(
      'Project request submitted successfully.'
    );
  }


  /*
   * =========================================================
   * QUOTE REQUEST
   * =========================================================
   */

  function openQuoteModal() {
    quoteTitle = '';
    quoteDetails = '';

    showQuoteModal = true;
  }


  function closeQuoteModal() {
    if (quoteSubmitting) return;

    showQuoteModal = false;
  }


  function handleQuoteSubmit() {
    if (!quoteTitle.trim()) {
      action(
        'Please enter what you need a quote for.'
      );

      return;
    }

    quoteSubmitting = true;
  }


  async function handleQuoteResult({
    update
  }) {
    quoteSubmitting = false;

    const result = await update();

    if (result?.type === 'failure') {
      action(
        result?.data?.error ||
          'Unable to submit the quote request.'
      );

      return;
    }

    showQuoteModal = false;

    quoteTitle = '';
    quoteDetails = '';

    await invalidateAll();

    active = 'quotes';

    action(
      'Quote request submitted successfully.'
    );
  }


  /*
   * =========================================================
   * MESSAGING
   * =========================================================
   */

  function scrollToComposer() {
    active = 'messages';

    requestAnimationFrame(() => {
      document
        .querySelector(
          '#message-composer'
        )
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });

      document
        .querySelector(
          '#message-input'
        )
        ?.focus();
    });
  }


  function handleMessageSubmit() {
    sendingMessage = true;
  }


  async function handleMessageResult({
    update
  }) {
    sendingMessage = false;

    const result = await update();

    if (result?.type === 'failure') {
      action(
        result?.data?.error ||
          'Unable to send the message.'
      );

      return;
    }

    messageBody = '';

    action(
      'Message sent securely to the Origins team.'
    );
  }


  /*
   * =========================================================
   * PREFERENCES
   * =========================================================
   */

  function loadPreferences() {
    const savedTheme =
      localStorage.getItem(
        'origins-theme'
      );

    if (
      savedTheme === 'light' ||
      savedTheme === 'dark'
    ) {
      theme = savedTheme;
    }

    const savedProjects =
      localStorage.getItem(
        'origins-notifications-projects'
      );

    const savedBilling =
      localStorage.getItem(
        'origins-notifications-billing'
      );

    const savedMessages =
      localStorage.getItem(
        'origins-notifications-messages'
      );

    if (
      savedProjects !== null
    ) {
      projectNotifications =
        savedProjects === 'true';
    }

    if (
      savedBilling !== null
    ) {
      billingNotifications =
        savedBilling === 'true';
    }

    if (
      savedMessages !== null
    ) {
      messageNotifications =
        savedMessages === 'true';
    }

    document.documentElement.dataset.theme =
      theme;
  }


  function saveNotificationPreference(
    key,
    value
  ) {
    localStorage.setItem(
      key,
      String(value)
    );

    action(
      'Notification preferences updated.'
    );
  }
</script>


<svelte:head>

  <title>
    {title} · Origins Client Portal
  </title>

  <meta
    name="description"
    content="Origins Client Portal"
  />

</svelte:head>


<div class="portal-shell">

  <!-- MOBILE BACKDROP -->

  <div
    class:open={mobileOpen}
    class="mobile-backdrop"
    onclick={() =>
      (mobileOpen = false)}
  ></div>


  <!-- =====================================================
       SIDEBAR
       ===================================================== -->

  <aside
    class:open={mobileOpen}
    class="sidebar"
  >

    <div class="brand">

      <img
        src="/images/origins-logo.png"
        alt="Origins"
        class="brand-logo"
      />

      <div>

        <strong>
          ORIGINS
        </strong>

        <span>
          CLIENT PORTAL
        </span>

      </div>

    </div>


    <div class="workspace-switcher">

      <span class="eyebrow">
        WORKSPACE
      </span>

      <button
        type="button"
        onclick={() =>
          action(
            'Workspace switching will be available when multiple organisations are connected.'
          )}
      >

        <span class="workspace-avatar">
          {initials}
        </span>

        <span class="workspace-name">

          <b>
            {workspaceName}
          </b>

          <small>
            Client workspace
          </small>

        </span>

        <span class="chevron">
          ⌄
        </span>

      </button>

    </div>


    <nav
      class="portal-nav"
      aria-label="Portal navigation"
    >

      <span class="nav-label">
        Workspace
      </span>

      {#each nav as item}

        <button
          class:active={
            active === item[0]
          }
          type="button"
          onclick={() =>
            select(item[0])}
        >

          <span class="nav-icon">
            {item[2]}
          </span>

          <span>
            {item[1]}
          </span>

          {#if item[0] === 'messages' && messages.length}

            <i class="nav-badge">
              {messages.length}
            </i>

          {/if}

        </button>

      {/each}

    </nav>


    <div class="sidebar-bottom">

      <div class="support-card">

        <span class="support-dot"></span>

        <div>

          <b>
            Origins team online
          </b>

          <small>
            Typical reply under 1 day
          </small>

        </div>

        <span class="support-live">
          LIVE
        </span>

      </div>


      <div class="user-row-wrap">

        <button
          class="user-row"
          type="button"
          onclick={() =>
            select('settings')}
        >

          <span class="user-avatar">
            {initials}
          </span>

          <span class="user-details">

            <b>
              {displayName}
            </b>

            <small>
              {userEmail}
            </small>

          </span>

          <span class="user-chevron">
            ›
          </span>

        </button>


        <form
          method="POST"
          action="?/logout"
        >

          <button
            class="logout-button"
            type="submit"
            aria-label="Log out of Origins Client Portal"
          >

            <span class="logout-icon">
              ↪
            </span>

            <span>
              Log out
            </span>

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

      <button
        class="mobile-menu"
        type="button"
        aria-label="Open navigation"
        onclick={() =>
          (mobileOpen = true)}
      >
        ☰
      </button>


      <div class="breadcrumbs">

        <span>
          {workspaceName}
        </span>

        <b>
          /
        </b>

        <strong>
          {title}
        </strong>

      </div>


      <div class="top-actions">

        <button
          class="icon-button"
          type="button"
          aria-label="Search"
          onclick={() =>
            action(
              'Search is ready — try the global command bar.'
            )}
        >
          ⌕
        </button>


        <button
          class="icon-button theme-button"
          type="button"
          aria-label="Toggle light and dark mode"
          onclick={toggleTheme}
        >
          {theme === 'dark'
            ? '☼'
            : '☾'}
        </button>


        <button
          class="icon-button notification"
          type="button"
          aria-label="Notifications"
          onclick={() =>
            action(
              'You have 2 new notifications.'
            )}
        >

          ♧

          <i></i>

        </button>


        <button
          class="top-avatar"
          type="button"
          aria-label="Open settings"
          onclick={() =>
            select('settings')}
        >
          {initials}
        </button>

      </div>

    </header>


    <!-- TOAST -->

    {#if notice}

      <div
        class="toast"
        role="status"
      >

        <span>
          {notice}
        </span>

        <span>
          ✓
        </span>

      </div>

    {/if}


    <div class="content">


      <!-- =================================================
           OVERVIEW
           ================================================= -->

      {#if active === 'overview'}

        <section class="page-head">

          <div>

            <span class="eyebrow live">

              <i></i>

              CLIENT WORKSPACE

            </span>


            <h1>
              Good afternoon,
              {displayName}.
            </h1>


            <p>
              Here’s the current picture
              across your Origins work.
            </p>

          </div>


          <button
            class="button primary"
            type="button"
            onclick={openProjectModal}
          >
            + New request
          </button>

        </section>


        <section class="signal-grid">

          <article class="signal-card featured">

            <div class="signal-card-head">

              <span>
                ACCOUNT HEALTH
              </span>

              <em>
                Good
              </em>

            </div>

            <div class="signal-value">
              —
            </div>

            <p>
              Delivery confidence will
              appear once work is assigned.
            </p>

            <div class="empty-meter">
              No delivery data yet
            </div>

          </article>


          <article class="signal-card">

            <div class="signal-card-head">

              <span>
                ACTIVE PROJECTS
              </span>

              <em class="neutral">
                {activeProjects}
              </em>

            </div>

            <div class="signal-value">
              {String(activeProjects)
                .padStart(2, '0')}
            </div>

            <p>
              {activeProjects === 0
                ? 'No projects have been assigned yet'
                : 'Projects currently in delivery'}
            </p>

            <button
              class="card-link"
              type="button"
              onclick={() =>
                select('projects')}
            >
              View projects
              <span>
                ↗
              </span>
            </button>

          </article>


          <article class="signal-card">

            <div class="signal-card-head">

              <span>
                OUTSTANDING
              </span>

              <em class="warning">

                {outstandingInvoices.length}
                due

              </em>

            </div>


            <div class="signal-value">

              {money(
                outstandingAmount
              )}

            </div>


            <p>

              {outstandingInvoices.length
                ? 'Outstanding client invoices'
                : 'No outstanding invoices'}

            </p>


            <button
              class="card-link"
              type="button"
              onclick={() =>
                select('invoices')}
            >

              View invoices

              <span>
                ↗
              </span>

            </button>

          </article>

        </section>


        <section class="section-grid">

          <article class="panel project-panel">

            <div class="panel-head">

              <div>

                <span class="eyebrow">
                  DELIVERY
                </span>

                <h2>
                  Active projects
                </h2>

              </div>


              <button
                class="text-button"
                type="button"
                onclick={() =>
                  select('projects')}
              >
                View all ↗
              </button>

            </div>


            {#if projects.length}

              {#each projects as project}

                <div class="project-row">

                  <div class="project-symbol">

                    {project.code?.slice(-2) ||
                      'PR'}

                  </div>


                  <div class="project-main">

                    <div class="project-title">

                      <b>
                        {project.name}
                      </b>

                      <span
                        class:review={
                          project.status ===
                          'review'
                        }
                      >
                        {statusLabel(
                          project.status
                        )}
                      </span>

                    </div>


                    <small>

                      {project.code}
                      · Lead
                      {project.leadName ||
                        'Origins team'}

                    </small>


                    <div class="progress">

                      <i
                        style={`width:${Math.min(
                          100,
                          Math.max(
                            0,
                            Number(
                              project.progress ||
                                0
                            )
                          )
                        )}%`}
                      ></i>

                    </div>

                  </div>


                  <div class="project-meta">

                    <strong>
                      {project.progress || 0}%
                    </strong>

                    <small>
                      Due
                      {formatDate(
                        project.dueDate
                      )}
                    </small>

                  </div>

                </div>

              {/each}

            {:else}

              <div class="empty-state">

                <span class="empty-icon">
                  ◫
                </span>

                <h3>
                  No projects yet
                </h3>

                <p>
                  Your workspace is ready.
                  Start a project request and
                  the Origins team can begin
                  planning it with you.
                </p>

                <button
                  class="button secondary"
                  type="button"
                  onclick={openProjectModal}
                >
                  Start a project request ↗
                </button>

              </div>

            {/if}

          </article>


          <article class="panel">

            <div class="panel-head">

              <div>

                <span class="eyebrow">
                  NEXT UP
                </span>

                <h2>
                  Recent activity
                </h2>

              </div>

            </div>


            <div class="activity">

              {#if latestMessages.length}

                {#each latestMessages as message}

                  <div>

                    <span class="activity-dot">
                      ◒
                    </span>

                    <p>

                      <b>
                        New message
                      </b>

                      <small>

                        {message.body?.slice(
                          0,
                          90
                        )}

                        ·

                        {formatDate(
                          message.createdAt
                        )}

                      </small>

                    </p>

                  </div>

                {/each}

              {:else}

                <div>

                  <span class="activity-dot done">
                    ✓
                  </span>

                  <p>

                    <b>
                      Your workspace is ready
                    </b>

                    <small>
                      Submit a project request,
                      request a quote or message
                      the Origins team to get
                      started.
                    </small>

                  </p>

                </div>

              {/if}

            </div>

          </article>

        </section>


        <section class="banner">

          <div>

            <span class="eyebrow">
              NEED SOMETHING?
            </span>

            <h2>
              Keep the next request simple.
            </h2>

            <p>
              Ask about delivery, scope,
              documents, billing or anything
              your team needs from Origins.
            </p>

          </div>


          <button
            class="button ghost"
            type="button"
            onclick={scrollToComposer}
          >
            Contact the team
            <span>
              ↗
            </span>
          </button>

        </section>


      <!-- =================================================
           PROJECTS
           ================================================= -->

      {:else if active === 'projects'}

        <section class="page-head">

          <div>

            <span class="eyebrow">
              DELIVERY
            </span>

            <h1>
              Projects
            </h1>

            <p>
              Live delivery status,
              milestones and project contacts.
            </p>

          </div>


          <button
            class="button primary"
            type="button"
            onclick={openProjectModal}
          >
            + New project
          </button>

        </section>


        <section class="list-panel">

          {#if projects.length}

            {#each projects as project}

              <article class="detail-row">

                <div class="project-symbol large">

                  {project.code?.slice(-2) ||
                    'PR'}

                </div>


                <div class="detail-grow">

                  <div class="project-title">

                    <h3>
                      {project.name}
                    </h3>

                    <span
                      class:review={
                        project.status ===
                        'review'
                      }
                    >
                      {statusLabel(
                        project.status
                      )}
                    </span>

                  </div>


                  <p>

                    {project.code}
                    · Delivery lead
                    {project.leadName ||
                      'Origins team'}

                  </p>


                  <div class="progress">

                    <i
                      style={`width:${Math.min(
                        100,
                        Math.max(
                          0,
                          Number(
                            project.progress ||
                              0
                          )
                        )
                      )}%`}
                    ></i>

                  </div>

                </div>


                <div class="detail-stat">

                  <strong>
                    {project.progress || 0}%
                  </strong>

                  <small>
                    complete
                  </small>

                </div>


                <div class="detail-stat">

                  <strong>
                    {formatDate(
                      project.dueDate
                    )}
                  </strong>

                  <small>
                    target date
                  </small>

                </div>


                <button
                  class="row-action"
                  type="button"
                  onclick={() =>
                    action(
                      `Project ${project.name} is currently available in your workspace.`
                    )}
                >
                  Open ↗
                </button>

              </article>

            {/each}

          {:else}

            <div class="empty-state">

              <span class="empty-icon">
                ◫
              </span>

              <h3>
                No projects yet
              </h3>

              <p>
                Start a project request and
                the Origins team can begin
                planning your work.
              </p>

              <button
                class="button secondary"
                type="button"
                onclick={openProjectModal}
              >
                New project request ↗
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

            <span class="eyebrow">
              COMMERCIAL
            </span>

            <h1>
              Quotes
            </h1>

            <p>
              Review proposals, scope and
              approval status.
            </p>

          </div>


          <button
            class="button primary"
            type="button"
            onclick={openQuoteModal}
          >
            Request a quote
          </button>

        </section>


        <section class="list-panel">

          {#if quotes.length}

            {#each quotes as quote}

              <article class="detail-row">

                <div class="doc-icon">
                  Q
                </div>


                <div class="detail-grow">

                  <div class="project-title">

                    <h3>
                      {quote.title}
                    </h3>

                    <span
                      class:review={
                        quote.status ===
                        'sent'
                      }
                    >
                      {statusLabel(
                        quote.status
                      )}
                    </span>

                  </div>


                  <p>

                    {quote.reference}
                    ·

                    {quote.expiresAt
                      ? `Expires ${formatDate(
                          quote.expiresAt
                        )}`
                      : 'No expiry date'}

                  </p>

                </div>


                <div class="detail-stat">

                  <strong>
                    {money(
                      quote.amount
                    )}
                  </strong>

                  <small>
                    total
                  </small>

                </div>


                <button
                  class="row-action"
                  type="button"
                  onclick={() =>
                    action(
                      `Quote ${quote.reference} is available in your workspace.`
                    )}
                >
                  Open ↗
                </button>

              </article>

            {/each}

          {:else}

            <div class="empty-state">

              <span class="empty-icon">
                ◌
              </span>

              <h3>
                No quotes yet
              </h3>

              <p>
                Request a quote and the
                Origins team can prepare the
                scope and commercial details.
              </p>

              <button
                class="button secondary"
                type="button"
                onclick={openQuoteModal}
              >
                Request a quote ↗
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

            <span class="eyebrow">
              BILLING
            </span>

            <h1>
              Invoices
            </h1>

            <p>
              Payment history and
              outstanding balances.
            </p>

          </div>


          <button
            class="button secondary"
            type="button"
            onclick={exportInvoicesCsv}
          >
            Export CSV ↓
          </button>

        </section>


        <section class="billing-summary">

          <div>

            <span>
              Outstanding
            </span>

            <strong>
              {money(
                outstandingAmount
              )}
            </strong>

            <small>

              {outstandingInvoices.length
                ? `${outstandingInvoices.length} invoice${
                    outstandingInvoices.length ===
                    1
                      ? ''
                      : 's'
                  } due`
                : 'Nothing due'}

            </small>

          </div>


          <div>

            <span>
              Paid invoices
            </span>

            <strong>

              {
                invoices.filter(
                  (invoice) =>
                    invoice.status ===
                    'paid'
                ).length
              }

            </strong>

            <small>
              Recorded in this workspace
            </small>

          </div>


          <div>

            <span>
              Account balance
            </span>

            <strong>
              $0.00
            </strong>

            <small>
              No credit or overpayment
            </small>

          </div>

        </section>


        <section class="list-panel invoice-list">

          <div class="table-head">

            <span>
              Invoice
            </span>

            <span>
              Project
            </span>

            <span>
              Issued
            </span>

            <span>
              Due
            </span>

            <span>
              Amount
            </span>

            <span>
              Status
            </span>

          </div>


          {#if invoices.length}

            {#each invoices as invoice}

              <div class="invoice-row">

                <b>
                  {invoice.reference}
                </b>

                <span>
                  —
                </span>

                <span>
                  {formatDate(
                    invoice.issuedAt
                  )}
                </span>

                <span>
                  {formatDate(
                    invoice.dueAt
                  )}
                </span>

                <strong>
                  {money(
                    invoice.amount,
                    invoice.currency
                  )}
                </strong>

                <span
                  class="status"
                  class:paid={
                    invoice.status ===
                    'paid'
                  }
                >
                  {statusLabel(
                    invoice.status
                  )}
                </span>

                <button
                  type="button"
                  aria-label={`Open invoice ${invoice.reference}`}
                  onclick={() =>
                    action(
                      `Invoice ${invoice.reference} opened.`
                    )}
                >
                  ↗
                </button>

              </div>

            {/each}

          {:else}

            <div class="empty-state">

              <span class="empty-icon">
                ◇
              </span>

              <h3>
                No invoices yet
              </h3>

              <p>
                Billing records will appear
                here when Origins issues an
                invoice to your organization.
              </p>

            </div>

          {/if}

        </section>


      <!-- =================================================
           DOCUMENTS
           ================================================= -->

      {:else if active === 'documents'}

        <section class="page-head">

          <div>

            <span class="eyebrow">
              FILES
            </span>

            <h1>
              Documents
            </h1>

            <p>
              Project documents, reports and
              commercial records in one place.
            </p>

          </div>


          <button
            class="button primary"
            type="button"
            onclick={() =>
              action(
                'Document upload is the next storage workflow to connect.'
              )}
          >
            Upload file
          </button>

        </section>


        <section class="document-grid">

          {#if docs.length}

            {#each docs as doc}

              <article
                class="document-card"
                role="button"
                tabindex="0"
                onclick={() =>
                  action(
                    `Opening ${doc.name}`
                  )}
                onkeydown={(event) => {

                  if (
                    event.key ===
                      'Enter' ||
                    event.key ===
                      ' '
                  ) {

                    action(
                      `Opening ${doc.name}`
                    );

                  }

                }}
              >

                <div class="doc-top">

                  <span class="doc-icon">
                    □
                  </span>

                  <span>
                    {doc.mimeType ||
                      'FILE'}
                    ↗
                  </span>

                </div>


                <h3>
                  {doc.name}
                </h3>


                <p>

                  {doc.projectId
                    ? 'Project document'
                    : 'Workspace document'}

                </p>


                <small>

                  {formatDate(
                    doc.createdAt
                  )}

                </small>

              </article>

            {/each}

          {:else}

            <div class="empty-state">

              <span class="empty-icon">
                □
              </span>

              <h3>
                No documents yet
              </h3>

              <p>
                Documents uploaded by Origins
                will appear here.
              </p>

            </div>

          {/if}

        </section>


      <!-- =================================================
           MESSAGES
           ================================================= -->

      {:else if active === 'messages'}

        <section class="page-head">

          <div>

            <span class="eyebrow">
              COMMUNICATION
            </span>

            <h1>
              Messages
            </h1>

            <p>
              Direct, private communication
              with the Origins team.
            </p>

          </div>


          <button
            class="button primary"
            type="button"
            onclick={scrollToComposer}
          >

            <span>
              New message
            </span>

            <span>
              ↗
            </span>

          </button>

        </section>


        <section class="messages-panel">

          <div class="message-list">

            <div class="messages-header">

              <div>

                <span class="eyebrow">
                  SECURE CHANNEL
                </span>

                <h2>
                  Origins team
                </h2>

              </div>


              <span class="secure-pill">

                <i></i>

                Encrypted workspace

              </span>

            </div>


            {#if messages.length}

              {#each messages as message, index}

                <article
                  class:active={
                    index === 0
                  }
                  class="message-item"
                >

                  <span class="user-avatar">

                    {message.sender
                      ?.fullName
                      ?.split(' ')
                      .map(
                        (part) =>
                          part[0]
                      )
                      .join('')
                      .slice(0, 2)
                      .toUpperCase() ||
                      'O'}

                  </span>


                  <div class="message-content">

                    <div class="message-meta">

                      <div>

                        <b>
                          {message.sender
                            ?.fullName ||
                            'Origins team'}
                        </b>

                        <small>

                          {message.conversation
                            ?.subject ||
                            'Workspace message'}

                        </small>

                      </div>


                      <time>

                        {formatDate(
                          message.createdAt
                        )}

                      </time>

                    </div>


                    <p>
                      {message.body}
                    </p>

                  </div>

                </article>

              {/each}

            {:else}

              <div class="message-empty">

                <div class="empty-message-orb">
                  ◒
                </div>

                <h3>
                  Your conversation starts here
                </h3>

                <p>
                  Send your Origins team a
                  message about delivery,
                  billing, documents, scope
                  or anything else.
                </p>

                <button
                  class="button secondary"
                  type="button"
                  onclick={scrollToComposer}
                >
                  Start conversation ↗
                </button>

              </div>

            {/if}

          </div>


          <div
            class="message-compose"
            id="message-composer"
          >

            <div class="composer-heading">

              <div>

                <span class="eyebrow">
                  QUICK REPLY
                </span>

                <h2>
                  Write to Origins
                </h2>

              </div>


              <span class="composer-status">

                <i></i>

                Team available

              </span>

            </div>


            <form
              method="POST"
              action="?/sendMessage"
              use:enhance={() => {

                handleMessageSubmit();

                return async ({
                  update
                }) => {

                  await handleMessageResult({
                    update
                  });

                };

              }}
            >

              <div class="composer-input">

                <textarea
                  id="message-input"
                  name="body"
                  bind:value={messageBody}
                  maxlength="4000"
                  rows="6"
                  required
                  placeholder="Tell the Origins team what you need..."
                ></textarea>


                <div class="composer-tools">

                  <span>
                    {messageBody.length}/4000
                  </span>

                  <span>
                    Replies stay inside your
                    secure workspace.
                  </span>

                </div>

              </div>


              <div class="compose-actions">

                <small>
                  Usually replies within one
                  business day.
                </small>


                <button
                  class="button primary"
                  type="submit"
                  disabled={
                    sendingMessage ||
                    !messageBody.trim()
                  }
                >

                  {#if sendingMessage}

                    <span class="button-spinner"></span>

                    Sending…

                  {:else}

                    Send securely ↗

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

            <span class="eyebrow">
              ACCOUNT
            </span>

            <h1>
              Settings
            </h1>

            <p>
              Manage your Origins workspace
              profile and preferences.
            </p>

          </div>

        </section>


        <section class="settings-grid">

          <article class="panel settings-card">

            <div class="settings-card-heading">

              <div>

                <span class="eyebrow">
                  PROFILE
                </span>

                <h2>
                  Personal details
                </h2>

                <p>
                  These details identify you
                  inside the client workspace.
                </p>

              </div>


              <span class="settings-icon">
                ◎
              </span>

            </div>


            <form
              method="POST"
              action="?/saveProfile"
              use:enhance
              class="settings-form"
            >

              <label class="wide">

                <span>
                  Name
                </span>

                <input
                  name="name"
                  value={displayName}
                  autocomplete="name"
                  required
                />

              </label>


              <label class="wide">

                <span>
                  Email
                </span>

                <input
                  value={userEmail}
                  readonly
                />

                <small>
                  Your login email is managed
                  through your secure account.
                </small>

              </label>


              <label class="wide">

                <span>
                  Role
                </span>

                <input
                  value={
                    profile?.role ||
                    'client'
                  }
                  readonly
                />

              </label>


              <button
                class="button primary"
                type="submit"
              >
                Save profile ↗
              </button>

            </form>

          </article>


          <article class="panel settings-card">

            <div class="settings-card-heading">

              <div>

                <span class="eyebrow">
                  PREFERENCES
                </span>

                <h2>
                  Notifications
                </h2>

                <p>
                  Choose which workspace
                  updates you want to receive.
                </p>

              </div>


              <span class="settings-icon">
                ◌
              </span>

            </div>


            <div class="preference-list">

              <label class="toggle-row">

                <span>

                  <b>
                    Project updates
                  </b>

                  <small>
                    Milestones, risks and
                    delivery notes
                  </small>

                </span>


                <input
                  type="checkbox"
                  checked={
                    projectNotifications
                  }
                  onchange={(event) => {

                    projectNotifications =
                      event.currentTarget
                        .checked;

                    saveNotificationPreference(
                      'origins-notifications-projects',
                      projectNotifications
                    );

                  }}
                />

              </label>


              <label class="toggle-row">

                <span>

                  <b>
                    Billing updates
                  </b>

                  <small>
                    Invoices, receipts and
                    payment reminders
                  </small>

                </span>


                <input
                  type="checkbox"
                  checked={
                    billingNotifications
                  }
                  onchange={(event) => {

                    billingNotifications =
                      event.currentTarget
                        .checked;

                    saveNotificationPreference(
                      'origins-notifications-billing',
                      billingNotifications
                    );

                  }}
                />

              </label>


              <label class="toggle-row">

                <span>

                  <b>
                    Messages
                  </b>

                  <small>
                    Direct replies from your
                    Origins team
                  </small>

                </span>


                <input
                  type="checkbox"
                  checked={
                    messageNotifications
                  }
                  onchange={(event) => {

                    messageNotifications =
                      event.currentTarget
                        .checked;

                    saveNotificationPreference(
                      'origins-notifications-messages',
                      messageNotifications
                    );

                  }}
                />

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

    <div
      class="modal-backdrop"
      role="presentation"
      onclick={(event) => {

        if (
          event.target ===
          event.currentTarget
        ) {
          closeProjectModal();
        }

      }}
    >

      <section
        class="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-modal-title"
      >

        <div class="modal-head">

          <div>

            <span class="eyebrow">
              NEW REQUEST
            </span>

            <h2 id="project-modal-title">
              Start a project
            </h2>

            <p>
              Tell the Origins team what
              you would like to create.
            </p>

          </div>


          <button
            class="modal-close"
            type="button"
            aria-label="Close"
            onclick={closeProjectModal}
          >
            ×
          </button>

        </div>


        <form
          method="POST"
          action="?/createProject"
          use:enhance={() => {

            handleProjectSubmit();

            return async ({
              update
            }) => {

              await handleProjectResult({
                update
              });

            };

          }}
        >

          <label class="modal-field">

            <span>
              Project name
            </span>

            <input
              name="name"
              bind:value={projectName}
              maxlength="160"
              required
              autofocus
              placeholder="e.g. Website redesign"
            />

          </label>


          <label class="modal-field">

            <span>
              Project brief
            </span>

            <textarea
              name="description"
              bind:value={projectDescription}
              maxlength="4000"
              rows="6"
              placeholder="Tell the Origins team about the project, goals, scope or anything important..."
            ></textarea>

          </label>


          <div class="modal-note">

            <span>
              ✦
            </span>

            <p>
              This creates a project request
              in your workspace. The Origins
              team can then review the request
              and continue the planning process.
            </p>

          </div>


          <div class="modal-actions">

            <button
              class="button secondary"
              type="button"
              onclick={closeProjectModal}
              disabled={projectSubmitting}
            >
              Cancel
            </button>


            <button
              class="button primary"
              type="submit"
              disabled={
                projectSubmitting ||
                !projectName.trim()
              }
            >

              {#if projectSubmitting}

                <span class="button-spinner"></span>

                Submitting…

              {:else}

                Submit request ↗

              {/if}

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

    <div
      class="modal-backdrop"
      role="presentation"
      onclick={(event) => {

        if (
          event.target ===
          event.currentTarget
        ) {
          closeQuoteModal();
        }

      }}
    >

      <section
        class="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quote-modal-title"
      >

        <div class="modal-head">

          <div>

            <span class="eyebrow">
              COMMERCIAL
            </span>

            <h2 id="quote-modal-title">
              Request a quote
            </h2>

            <p>
              Give the Origins team enough
              context to prepare your request.
            </p>

          </div>


          <button
            class="modal-close"
            type="button"
            aria-label="Close"
            onclick={closeQuoteModal}
          >
            ×
          </button>

        </div>


        <form
          method="POST"
          action="?/requestQuote"
          use:enhance={() => {

            handleQuoteSubmit();

            return async ({
              update
            }) => {

              await handleQuoteResult({
                update
              });

            };

          }}
        >

          <label class="modal-field">

            <span>
              What do you need a quote for?
            </span>

            <input
              name="title"
              bind:value={quoteTitle}
              maxlength="200"
              required
              autofocus
              placeholder="e.g. Brand identity package"
            />

          </label>


          <label class="modal-field">

            <span>
              Details
            </span>

            <textarea
              name="details"
              bind:value={quoteDetails}
              maxlength="4000"
              rows="6"
              placeholder="Describe the scope, deliverables, timing or other requirements..."
            ></textarea>

          </label>


          <div class="modal-note">

            <span>
              $
            </span>

            <p>
              You do not need to enter an
              amount. The Origins team will
              review the request and prepare
              the commercial details.
            </p>

          </div>


          <div class="modal-actions">

            <button
              class="button secondary"
              type="button"
              onclick={closeQuoteModal}
              disabled={quoteSubmitting}
            >
              Cancel
            </button>


            <button
              class="button primary"
              type="submit"
              disabled={
                quoteSubmitting ||
                !quoteTitle.trim()
              }
            >

              {#if quoteSubmitting}

                <span class="button-spinner"></span>

                Sending…

              {:else}

                Request quote ↗

              {/if}

            </button>

          </div>

        </form>

      </section>

    </div>

  {/if}

</div>


<style>
  /*
   * Modal styles are self-contained so the new
   * request / quote workflow works even if your
   * existing portal stylesheet doesn't contain
   * modal styles.
   */

  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: rgba(4, 15, 11, 0.72);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
  }

  .modal {
    width: min(620px, 100%);
    max-height: calc(100vh - 48px);
    overflow-y: auto;
    padding: 32px;
    border: 1px solid rgba(255, 255, 255, 0.10);
    border-radius: 24px;
    background:
      linear-gradient(
        145deg,
        rgba(24, 47, 39, 0.98),
        rgba(10, 26, 20, 0.98)
      );
    box-shadow:
      0 30px 100px rgba(0, 0, 0, 0.45),
      0 0 0 1px rgba(255, 255, 255, 0.025);
  }

  .modal-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 28px;
  }

  .modal-head h2 {
    margin: 7px 0 8px;
    font-size: 30px;
    line-height: 1.1;
  }

  .modal-head p {
    max-width: 470px;
    margin: 0;
    color: rgba(255, 255, 255, 0.62);
    line-height: 1.65;
  }

  .modal-close {
    width: 40px;
    height: 40px;
    flex: 0 0 40px;
    border: 1px solid rgba(255, 255, 255, 0.10);
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.04);
    color: rgba(255, 255, 255, 0.75);
    font-size: 24px;
    cursor: pointer;
    transition:
      transform 0.2s ease,
      background 0.2s ease;
  }

  .modal-close:hover {
    transform: rotate(90deg);
    background: rgba(255, 255, 255, 0.09);
  }

  .modal-field {
    display: block;
    margin-bottom: 20px;
  }

  .modal-field > span {
    display: block;
    margin-bottom: 9px;
    color: rgba(255, 255, 255, 0.84);
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.02em;
  }

  .modal-field input,
  .modal-field textarea {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid rgba(255, 255, 255, 0.10);
    border-radius: 14px;
    outline: none;
    background: rgba(255, 255, 255, 0.045);
    color: white;
    font: inherit;
    transition:
      border-color 0.2s ease,
      background 0.2s ease,
      box-shadow 0.2s ease;
  }

  .modal-field input {
    min-height: 52px;
    padding: 0 16px;
  }

  .modal-field textarea {
    min-height: 145px;
    padding: 15px 16px;
    resize: vertical;
    line-height: 1.6;
  }

  .modal-field input::placeholder,
  .modal-field textarea::placeholder {
    color: rgba(255, 255, 255, 0.32);
  }

  .modal-field input:focus,
  .modal-field textarea:focus {
    border-color: rgba(138, 191, 151, 0.72);
    background: rgba(255, 255, 255, 0.065);
    box-shadow:
      0 0 0 4px rgba(113, 168, 128, 0.10);
  }

  .modal-note {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    margin: 22px 0;
    padding: 15px 16px;
    border: 1px solid rgba(143, 194, 154, 0.12);
    border-radius: 14px;
    background: rgba(108, 166, 121, 0.055);
  }

  .modal-note > span {
    display: grid;
    width: 27px;
    height: 27px;
    flex: 0 0 27px;
    place-items: center;
    border-radius: 50%;
    background: rgba(128, 183, 139, 0.12);
    color: #a5cbaa;
  }

  .modal-note p {
    margin: 0;
    color: rgba(255, 255, 255, 0.57);
    font-size: 13px;
    line-height: 1.65;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 26px;
  }

  .button-spinner {
    display: inline-block;
    width: 14px;
    height: 14px;
    margin-right: 8px;
    vertical-align: -2px;
    border: 2px solid rgba(255, 255, 255, 0.30);
    border-top-color: white;
    border-radius: 50%;
    animation: origins-spin 0.7s linear infinite;
  }

  @keyframes origins-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 640px) {
    .modal-backdrop {
      align-items: flex-end;
      padding: 0;
    }

    .modal {
      max-height: 92vh;
      padding: 24px 20px;
      border-radius: 24px 24px 0 0;
    }

    .modal-head h2 {
      font-size: 26px;
    }

    .modal-actions {
      flex-direction: column-reverse;
    }

    .modal-actions .button {
      width: 100%;
    }
  }
</style>