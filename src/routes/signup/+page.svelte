<script>
  import { enhance } from '$app/forms';

  export let form;

  let password = '';
  let confirmPassword = '';

  $: passwordStrength =
    password.length === 0
      ? 0
      : password.length < 8
        ? 1
        : password.length < 12
          ? 2
          : 3;

  $: passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword;
</script>

<svelte:head>
  <title>Create account · Origins Client Portal</title>
  <meta
    name="description"
    content="Create your secure Origins Client Portal account."
  />
</svelte:head>

<div class="auth-shell">
  <section class="auth-brand-panel">
    <div class="ambient ambient-one"></div>
    <div class="ambient ambient-two"></div>

    <a class="auth-brand" href="/login">
      <img
        src="/images/origins-logo.png"
        alt="Origins"
        class="auth-logo"
      />

      <span class="brand-copy">
        <strong>ORIGINS</strong>
        <span>CLIENT PORTAL</span>
      </span>
    </a>

    <div class="auth-copy">
      <span class="eyebrow">YOUR WORKSPACE</span>

      <h1>
        Start with a secure
        <em>Origins account.</em>
      </h1>

      <p>
        Create your client login and we’ll use it to connect you with
        the projects, billing and documents your team has access to.
      </p>

      <div class="signup-benefits">
        <div class="benefit">
          <span class="benefit-number">01</span>
          <div>
            <strong>One private workspace</strong>
            <span>
              Access your projects, documents and billing from one place.
            </span>
          </div>
        </div>

        <div class="benefit">
          <span class="benefit-number">02</span>
          <div>
            <strong>Connected to your team</strong>
            <span>
              Stay directly connected with the Origins team throughout
              your project.
            </span>
          </div>
        </div>

        <div class="benefit">
          <span class="benefit-number">03</span>
          <div>
            <strong>Secure client access</strong>
            <span>
              Your workspace is private and limited to authorised access.
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="auth-foot">
      <span>ORIGINS LTD</span>
      <span class="foot-dot"></span>
      <span>CLIENT ACCESS</span>
    </div>
  </section>

  <main class="auth-panel">
    <div class="auth-card">
      <div class="card-glow"></div>

      <div class="auth-card-head">
        <span class="eyebrow">GET STARTED</span>

        <h2>Create account</h2>

        <p>
          Use your work email. You may need to confirm it before
          signing in.
        </p>
      </div>

      {#if form?.error}
        <div class="auth-message auth-error">
          <span class="message-icon">!</span>
          <span>{form.error}</span>
        </div>
      {/if}

      {#if form?.success}
        <div class="auth-message auth-success">
          <span class="message-icon">✓</span>
          <span>{form.success}</span>
        </div>
      {/if}

      <form class="auth-form" method="POST" use:enhance>
        <label>
          <span class="field-label">Full name</span>

          <div class="input-wrap">
            <span class="input-icon">◦</span>

            <input
              name="name"
              autocomplete="name"
              value={form?.name ?? ''}
              required
              placeholder="Your name"
            />
          </div>
        </label>

        <label>
          <span class="field-label">Work email</span>

          <div class="input-wrap">
            <span class="input-icon">@</span>

            <input
              name="email"
              type="email"
              autocomplete="email"
              value={form?.email ?? ''}
              required
              placeholder="you@company.com"
            />
          </div>
        </label>

        <label>
          <span class="field-label">Password</span>

          <div class="input-wrap">
            <span class="input-icon">••</span>

            <input
              name="password"
              type="password"
              autocomplete="new-password"
              minlength="8"
              bind:value={password}
              required
              placeholder="At least 8 characters"
            />
          </div>

          {#if password.length > 0}
            <div class="password-strength">
              <div class="strength-bars">
                <span class:active={passwordStrength >= 1}></span>
                <span class:active={passwordStrength >= 2}></span>
                <span class:active={passwordStrength >= 3}></span>
              </div>

              <span>
                {passwordStrength === 1
                  ? 'Minimum 8 characters'
                  : passwordStrength === 2
                    ? 'Good password'
                    : 'Strong password'}
              </span>
            </div>
          {/if}
        </label>

        <label>
          <span class="field-label">Confirm password</span>

          <div class="input-wrap">
            <span class="input-icon">••</span>

            <input
              name="confirm"
              type="password"
              autocomplete="new-password"
              minlength="8"
              bind:value={confirmPassword}
              required
              placeholder="Repeat your password"
            />

            {#if passwordsMatch}
              <span class="valid-icon">✓</span>
            {/if}
          </div>

          {#if confirmPassword.length > 0 && !passwordsMatch}
            <span class="password-error">
              Passwords do not match.
            </span>
          {/if}
        </label>

        <button
          class="button primary"
          type="submit"
          disabled={confirmPassword.length > 0 && !passwordsMatch}
        >
          <span>Create account</span>
          <span class="button-arrow">↗</span>
        </button>
      </form>

      <div class="auth-divider">
        <span></span>
        <small>PRIVATE CLIENT ACCESS</small>
        <span></span>
      </div>

      <div class="auth-bottom">
        <span>Already have an account?</span>
        <a href="/login">Sign in</a>
      </div>

      <div class="auth-legal">
        By creating an account, you agree to use this private
        workspace only for authorised business activity.
      </div>
    </div>
  </main>
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,500;0,600;1,500;1,600&display=swap');

  :global(*) {
    box-sizing: border-box;
  }

  :global(html),
  :global(body) {
    margin: 0;
    min-height: 100%;
  }

  :global(body) {
    background: #07100c;
    color: #f4f7f5;
    font-family: Inter, sans-serif;
  }

  :global(a) {
    color: inherit;
  }

  .auth-shell {
    position: relative;
    min-height: 100vh;

    display: grid;
    grid-template-columns:
      minmax(440px, 0.95fr)
      minmax(500px, 1.05fr);

    overflow: hidden;

    background:
      radial-gradient(
        circle at 15% 15%,
        rgba(0, 212, 126, 0.1),
        transparent 32%
      ),
      #07100c;
  }

  /* LEFT */

  .auth-brand-panel {
    position: relative;
    min-height: 100vh;

    display: flex;
    flex-direction: column;
    justify-content: space-between;

    padding: 46px 7vw 36px;

    overflow: hidden;

    border-right: 1px solid rgba(255, 255, 255, 0.06);

    background:
      linear-gradient(
        145deg,
        rgba(9, 26, 18, 0.98),
        rgba(5, 14, 10, 0.96)
      );
  }

  .ambient {
    position: absolute;
    border-radius: 999px;
    pointer-events: none;
  }

  .ambient-one {
    width: 420px;
    height: 420px;

    top: -180px;
    left: -160px;

    background: rgba(0, 212, 126, 0.08);
    filter: blur(2px);
  }

  .ambient-two {
    width: 360px;
    height: 360px;

    right: -200px;
    bottom: -140px;

    background: rgba(0, 212, 126, 0.045);
    filter: blur(2px);
  }

  .auth-brand {
    position: relative;
    z-index: 2;

    width: fit-content;

    display: flex;
    align-items: center;
    gap: 12px;

    text-decoration: none;
  }

  .auth-logo {
    width: 66px;
    height: 66px;

    display: block;

    object-fit: contain;
    flex-shrink: 0;
  }

  .brand-copy {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .brand-copy strong {
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.24em;
  }

  .brand-copy span {
    color: rgba(255, 255, 255, 0.42);

    font-size: 8px;
    font-weight: 600;
    letter-spacing: 0.24em;
  }

  .auth-copy {
    position: relative;
    z-index: 2;

    max-width: 620px;

    margin: auto 0;
    padding: 70px 0;
  }

  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 9px;

    color: #00d47e;

    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.22em;
  }

  .eyebrow::before {
    content: '';

    width: 20px;
    height: 1px;

    background: #00d47e;
    opacity: 0.7;
  }

  .auth-copy h1 {
    max-width: 600px;

    margin: 22px 0;

    font-family: 'Playfair Display', Georgia, serif;

    font-size: clamp(48px, 5vw, 76px);
    font-weight: 500;
    line-height: 0.98;
    letter-spacing: -0.045em;
  }

  .auth-copy h1 em {
    color: #00d47e;
    font-weight: 500;
  }

  .auth-copy > p {
    max-width: 510px;

    margin: 0;

    color: rgba(255, 255, 255, 0.54);

    font-size: 14px;
    line-height: 1.8;
  }

  .signup-benefits {
    display: grid;
    gap: 18px;

    margin-top: 44px;
  }

  .benefit {
    display: flex;
    align-items: flex-start;
    gap: 14px;

    max-width: 440px;
  }

  .benefit-number {
    width: 30px;
    height: 30px;

    display: grid;
    place-items: center;

    flex-shrink: 0;

    border: 1px solid rgba(0, 212, 126, 0.2);
    border-radius: 50%;

    color: #00d47e;

    font-size: 8px;
    font-weight: 700;
    letter-spacing: 0.05em;

    background: rgba(0, 212, 126, 0.04);
  }

  .benefit strong {
    display: block;

    margin-bottom: 4px;

    font-size: 11px;
    font-weight: 600;
  }

  .benefit div span {
    display: block;

    color: rgba(255, 255, 255, 0.35);

    font-size: 10px;
    line-height: 1.55;
  }

  .auth-foot {
    position: relative;
    z-index: 2;

    display: flex;
    align-items: center;
    gap: 10px;

    color: rgba(255, 255, 255, 0.28);

    font-size: 8px;
    font-weight: 600;
    letter-spacing: 0.18em;
  }

  .foot-dot {
    width: 3px;
    height: 3px;

    border-radius: 50%;

    background: #00d47e;
  }

  /* RIGHT */

  .auth-panel {
    min-height: 100vh;

    display: grid;
    place-items: center;

    padding: 50px;

    background:
      radial-gradient(
        circle at 70% 25%,
        rgba(0, 212, 126, 0.045),
        transparent 35%
      ),
      #09110d;
  }

  .auth-card {
    position: relative;

    width: min(100%, 500px);

    padding: 44px;

    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 24px;

    background:
      linear-gradient(
        145deg,
        rgba(19, 29, 24, 0.96),
        rgba(11, 19, 15, 0.98)
      );

    box-shadow:
      0 35px 90px rgba(0, 0, 0, 0.38),
      inset 0 1px 0 rgba(255, 255, 255, 0.035);

    backdrop-filter: blur(24px);
  }

  .card-glow {
    position: absolute;

    top: -1px;
    left: 12%;

    width: 76%;
    height: 1px;

    background:
      linear-gradient(
        90deg,
        transparent,
        rgba(0, 212, 126, 0.55),
        transparent
      );
  }

  .auth-card-head h2 {
    margin: 14px 0 10px;

    font-family: 'Playfair Display', Georgia, serif;

    font-size: 40px;
    font-weight: 500;

    letter-spacing: -0.035em;
  }

  .auth-card-head p {
    max-width: 390px;

    margin: 0;

    color: rgba(255, 255, 255, 0.43);

    font-size: 12px;
    line-height: 1.7;
  }

  /* MESSAGES */

  .auth-message {
    display: flex;
    align-items: flex-start;
    gap: 10px;

    margin-top: 24px;
    padding: 13px 14px;

    border-radius: 11px;

    font-size: 11px;
    line-height: 1.5;
  }

  .auth-error {
    border: 1px solid rgba(255, 80, 80, 0.16);
    background: rgba(255, 80, 80, 0.06);
    color: #ff9a9a;
  }

  .auth-success {
    border: 1px solid rgba(0, 212, 126, 0.16);
    background: rgba(0, 212, 126, 0.06);
    color: #70e8b0;
  }

  .message-icon {
    width: 20px;
    height: 20px;

    display: grid;
    place-items: center;

    flex-shrink: 0;

    border-radius: 50%;

    background: rgba(255, 255, 255, 0.06);

    font-size: 10px;
  }

  /* FORM */

  .auth-form {
    display: grid;
    gap: 17px;

    margin-top: 30px;
  }

  .auth-form label {
    display: grid;
    gap: 8px;
  }

  .field-label {
    color: rgba(255, 255, 255, 0.72);

    font-size: 10px;
    font-weight: 600;
  }

  .input-wrap {
    position: relative;
  }

  .input-icon {
    position: absolute;

    top: 50%;
    left: 15px;

    z-index: 1;

    transform: translateY(-50%);

    color: rgba(255, 255, 255, 0.25);

    font-size: 11px;

    pointer-events: none;
  }

  .input-wrap input {
    width: 100%;
    height: 50px;

    padding: 0 15px 0 42px;

    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 11px;

    outline: none;

    background: rgba(255, 255, 255, 0.035);

    color: #fff;

    font: inherit;
    font-size: 12px;

    transition:
      border-color 160ms ease,
      background 160ms ease,
      box-shadow 160ms ease;
  }

  .input-wrap input::placeholder {
    color: rgba(255, 255, 255, 0.22);
  }

  .input-wrap input:hover {
    border-color: rgba(255, 255, 255, 0.13);
  }

  .input-wrap input:focus {
    border-color: rgba(0, 212, 126, 0.55);

    background: rgba(0, 212, 126, 0.025);

    box-shadow:
      0 0 0 4px rgba(0, 212, 126, 0.055);
  }

  .valid-icon {
    position: absolute;

    top: 50%;
    right: 15px;

    width: 20px;
    height: 20px;

    display: grid;
    place-items: center;

    transform: translateY(-50%);

    border-radius: 50%;

    background: #00d47e;
    color: #04100a;

    font-size: 10px;
    font-weight: 700;
  }

  .password-strength {
    display: flex;
    align-items: center;
    gap: 9px;

    margin-top: 2px;

    color: rgba(255, 255, 255, 0.3);

    font-size: 8px;
  }

  .strength-bars {
    display: flex;
    gap: 3px;
  }

  .strength-bars span {
    width: 26px;
    height: 3px;

    border-radius: 99px;

    background: rgba(255, 255, 255, 0.08);

    transition:
      background 160ms ease,
      box-shadow 160ms ease;
  }

  .strength-bars span.active {
    background: #00d47e;

    box-shadow:
      0 0 8px rgba(0, 212, 126, 0.18);
  }

  .password-error {
    margin-top: -2px;

    color: #ff8585;

    font-size: 8px;
  }

  /* BUTTON */

  .button.primary {
    position: relative;

    width: 100%;
    height: 54px;

    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;

    margin-top: 5px;

    border: 0;
    border-radius: 11px;

    background: #00d47e;
    color: #04100a;

    font-family: Inter, sans-serif;
    font-size: 11px;
    font-weight: 700;

    cursor: pointer;
    overflow: hidden;

    transition:
      transform 160ms ease,
      box-shadow 160ms ease,
      background 160ms ease,
      opacity 160ms ease;
  }

  .button.primary::before {
    content: '';

    position: absolute;
    inset: 0;

    background:
      linear-gradient(
        110deg,
        transparent 20%,
        rgba(255, 255, 255, 0.25),
        transparent 70%
      );

    transform: translateX(-100%);

    transition: transform 500ms ease;
  }

  .button.primary:hover:not(:disabled) {
    background: #16df8b;

    transform: translateY(-1px);

    box-shadow:
      0 12px 30px rgba(0, 212, 126, 0.17);
  }

  .button.primary:hover:not(:disabled)::before {
    transform: translateX(100%);
  }

  .button.primary:active:not(:disabled) {
    transform: translateY(0);
  }

  .button.primary:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .button-arrow {
    font-size: 14px;
  }

  /* FOOTER */

  .auth-divider {
    display: flex;
    align-items: center;
    gap: 12px;

    margin: 28px 0 21px;
  }

  .auth-divider span {
    flex: 1;
    height: 1px;

    background: rgba(255, 255, 255, 0.06);
  }

  .auth-divider small {
    color: rgba(255, 255, 255, 0.2);

    font-size: 7px;
    font-weight: 700;
    letter-spacing: 0.2em;
  }

  .auth-bottom {
    display: flex;
    justify-content: center;
    gap: 5px;

    color: rgba(255, 255, 255, 0.35);

    font-size: 10px;
  }

  .auth-bottom a {
    color: #00d47e;

    font-weight: 600;

    text-decoration: none;
  }

  .auth-bottom a:hover {
    text-decoration: underline;
  }

  .auth-legal {
    margin-top: 22px;

    color: rgba(255, 255, 255, 0.2);

    font-size: 8px;
    line-height: 1.6;

    text-align: center;
  }

  /* RESPONSIVE */

  @media (max-width: 1000px) {
    .auth-shell {
      grid-template-columns: 1fr;
    }

    .auth-brand-panel {
      min-height: auto;

      padding: 32px;

      border-right: 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .auth-copy {
      padding: 70px 0 40px;
    }

    .auth-copy h1 {
      font-size: clamp(42px, 8vw, 64px);
    }

    .signup-benefits {
      display: none;
    }

    .auth-foot {
      display: none;
    }

    .auth-panel {
      min-height: auto;
      padding: 60px 24px;
    }
  }

  @media (max-width: 560px) {
    .auth-brand-panel {
      padding: 24px;
    }

    .auth-logo {
      width: 54px;
      height: 54px;
    }

    .auth-copy {
      padding: 55px 0 20px;
    }

    .auth-copy h1 {
      font-size: 42px;
    }

    .auth-copy > p {
      font-size: 12px;
    }

    .auth-panel {
      padding: 30px 16px 50px;
    }

    .auth-card {
      padding: 28px 22px;
      border-radius: 18px;
    }

    .auth-card-head h2 {
      font-size: 36px;
    }
  }
</style>